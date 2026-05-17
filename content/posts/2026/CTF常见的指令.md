---
title: CTF常见的指令
description: 常见指令skills。
date: 2026-05-17 18:27:43
updated: 2026-05-17 18:27:43
image: https://images.cnblogs.com/cnblogs_com/blogs/860797/galleries/2492655/o_260517104047_7c99f5ac-0222-4353-aab2-516d54d74aa2.png
categories: [安全]
tags: [skills]
path: /2026/ctf-commands
---

## CTF常见的指令

## tshark常见命令

基础的“读、滤、存”

这是最常用的三板斧，用于快速缩小分析范围。

- **1. 仅仅看一眼包里有什么（最简单）**

  Bash

  ```
  tshark -r data.pcapng
  ```

  *用途：* 就跟双击打开 Wireshark 一样，把所有包的信息在屏幕上滚一遍。

- **2. 只看特定协议或地址的包（结合过滤器）**

  Bash

  ```
  tshark -r data.pcapng -Y "http or dns"
  ```

  *用途：* `-Y` 就是 Wireshark 顶部的那个过滤框。这条命令意思是：“我只要看 HTTP 和 DNS 协议的包”。

- **3. 把过滤后的有用包，单独存成一个新文件**

  Bash

  ```
  tshark -r big_data.pcapng -Y "tcp.port == 80" -w small_data.pcap
  ```

  *用途：* `-w` 代表 Write（写入）。有时候几十 MB 的包太卡了，你可以用这个命令，把里面 80 端口（网页流量）单独剥离出来，存成一个全新的、非常小的 `small_data.pcap`，然后再慢慢分析。

------

CTF 抢分“神技”

出题人经常把密码或文件藏在流量里，这几个命令可以直接“隔空取物”。

- **1. 提取指定列的数据（你刚刚用过的神技）**

  Bash

  ```
  tshark -r data.pcapng -T fields -e usbhid.data > out.txt
  ```

  *用途：* 万能数据提取器。如果想提取所有的网址，把 `-e` 后面换成 `http.request.uri`；如果想提取源 IP，换成 `ip.src`。

- **2. 一键提取流量里的密码（抓取明文凭证）**

  Bash

  ```
  tshark -r data.pcapng -z credentials
  ```

  *用途：* 极度好用！`-z` 是统计分析参数。这条命令会自动扫描整个包，如果有人用 HTTP 或 FTP 协议明文登录了账号，它会直接把**账号和密码**打印在屏幕上。

- **3. 一键扒出流量里的所有文件（导出对象）**

  Bash

  ```
  tshark -r data.pcapng --export-objects http,./my_folder
  ```

  *用途：* CTF 常见套路是“黑客在下载木马”或“图片里藏了 flag”。这条命令会把通过 HTTP 协议传输的所有文件（图片、压缩包、网页），全自动剥离出来，保存在你指定的 `./my_folder` 文件夹里。

------

📖 附赠：常用的 `-Y` 过滤条件小抄

工具再好，也得配上精确的瞄准镜。以下是你写在 `-Y` 后面最常用的过滤条件：

- **查 IP：** `ip.addr == 192.168.1.1` (包含源或目的)
- **查端口：** `tcp.port == 8080`
- **查特定的词：** `http contains "flag"` (非常实用！直接全包搜索含有 flag 字眼的网页请求)
- **组合条件：** `ip.src == 10.0.0.1 and http` (源 IP 是 10.0.0.1 并且是 HTTP 协议)

---



## binwalk常见命令

**第一招：基础扫描（照 X 光）**

当你拿到一个图片、音频或任何不知道是什么的文件时，第一步永远是先“扫一眼”。

**命令：**

Bash

```lua
binwalk filename.jpg
```

**零基础大白话：** 不改变原文件，只是用 X 光扫一遍这个文件的底层代码。 如果它只是一张单纯的图片，结果可能只有一两行（显示 JPEG image data）。但如果出题人在里面塞了东西，结果列表里就会出现 `Zip archive data`、`RAR archive data` 或者第二个 `JPEG image data`。只要看到这些多出来的数据，就说明“有货”！

---



 **第二招：自动提取（拆快递）**

发现了里面藏着文件，下一步就是把它拿出来。

**命令：**

Bash

```shell
binwalk -e filename.jpg
```

**零基础大白话：** `-e` 就是 Extract（提取）。这是实战中最常用的一条命令。它不仅会帮你照 X 光，还会**自动**把肚子里藏着的 Zip、Rar 等文件全部剥离出来。 运行结束后，它会在当前目录下自动生成一个名为 `_filename.jpg.extracted` 的文件夹，里面装的就是拆出来的战利品。


---

**第三招：递归提取（俄罗斯套娃终结者）**

CTF 出题人特别喜欢“套娃”：图片里藏着 Zip，Zip 里藏着 Tar，Tar 里藏着另一个伪装的文件……手动一层层剥会让人崩溃。

**命令：**

Bash

```shell
binwalk -Me filename.jpg
```

**零基础大白话：** `-M` 就是 Matryoshka（俄罗斯套娃）。加上这个参数，`binwalk` 就会像一个不知疲倦的挖掘机，只要解压出来的东西里面还包含压缩包，它就会继续自动往下挖，直到把最底层的核心文件（通常是 `flag.txt`）掏出来为止。

第四招：熵值分析（测谎仪）

有时候你用基础扫描什么也没扫出来，但你确信这个文件有问题。这时候可以用这个进阶招数。

**命令：**

Bash

```bash
binwalk -E filename.bin
```

| **参数**     | **说明**                                             | **场景建议**                    |
| ------------ | ---------------------------------------------------- | ------------------------------- |
| **`-B`**     | **Signature Scan**: 默认扫描方式，扫描常见文件签名。 | 默认必选                        |
| **`-E`**     | **Entropy**: 熵值分析。                              | 用于判断文件是否被加密或压缩。  |
| **`-D`**     | **Raw Extract**: 手动提取特定格式。                  | 如 `-D='png:png'`，只提取 PNG。 |
| **`-r`**     | **Raw**: 强制识别为原始数据。                        | 当自动识别失效时尝试。          |
| **`--size`** | **Limit**: 限制扫描的文件大小。                      | 处理 GB 级别的镜像文件时使用。  |

---



## linux常用命令

**零基础必会的 Linux 核心命令清单（CTF 实战版）**

> **💡 零基础保命快捷键（比命令更重要）：**
>
> - `Tab` 键：**自动补全！** 敲文件名的前两个字母，按 Tab 键系统会自动帮你把名字补全，千万不要傻傻地手打全名！
> - `Ctrl + C`：**强制停止！** 如果屏幕疯狂滚动或者程序卡死了，按这个立刻强制打断。
> - `Ctrl + L`：**清屏！** 屏幕太乱了看不清，按这个可以把屏幕清理干净（等同于输入 `clear`）。
> - `↑` 上下方向键：**历史命令！** 可以快速调出你刚才敲过的命令。

---

**0x01 📂 目录与文件导航（我在哪？我要去哪？）**

* **`pwd`** (Print Working Directory)
  * **作用：** 看看我现在在哪个文件夹里。
  * **实战：** 迷路了就敲一下，它会告诉你绝对路径（如 `/home/user/downloads`）。

* **`ls`** (List)
  * **作用：** 看看当前文件夹里有什么东西。
  * **进阶用法：** `ls -la` （**极度常用**。`l` 表示详细列表，`a` 表示显示隐藏文件。CTF 经常把 flag 藏在 `.flag` 这种隐藏文件里）。

* **`cd`** (Change Directory)
  * **作用：** 进出文件夹。
  * **实战：** * `cd my_folder`：进入名叫 my_folder 的文件夹。
    * `cd ..`：退回上一级目录（注意有两个点）。
    * `cd ~`：直接一键回老家（用户的根目录）。

---

**0x02 📄 文件操作（增删改查）**

* **`mkdir`** (Make Directory)
  * **作用：** 新建一个文件夹。
  * **实战：** `mkdir ctf_pwn` 

* **`touch`**
  * **作用：** 新建一个空文件。
  * **实战：** `touch flag.txt`

* **`cp`** (Copy)
  * **作用：** 复制文件或文件夹。
  * **实战：** `cp flag.txt flag_backup.txt`

* **`mv`** (Move)
  * **作用：** 移动文件（也可以用来重命名）。
  * **实战：** `mv old_name.txt new_name.txt` （重命名文件）

* **`rm`** (Remove)
  * **作用：** 删除文件。
  * **⚠️ 危险警告：** `rm -rf 文件夹名` 可以强制删掉整个文件夹且**不进回收站**，敲回车前务必看清名字！

---

**0x03 👁️ 查看文件内容（不开编辑器直接看）**

* **`cat`** (Concatenate)
  * **作用：** 一次性把文件的所有内容打印在屏幕上。
  * **实战：** `cat flag.txt` （拿到 flag 时最激动的瞬间）。

* **`grep`**
  * **作用：** 文本搜字神器。
  * **实战：** `cat big_file.txt | grep "flag"` （在巨大的文件里，只把包含 "flag" 这四个字的行挑出来给你看）。

---

**0x04 ⚔️ 进阶必备（二进制/Pwn 实战专属）**

* **`file`**
  * **作用：** 照妖镜。不管文件后缀是什么，它能看穿这个文件的真实身份。
  * **实战：** `file unknown_file` （它会告诉你这是个图片、压缩包，还是可以执行的二进制程序）。

* **`strings`**
  * **作用：** 榨汁机。把一个乱码的二进制文件里，所有人类能看懂的英文字符全挤出来。
  * **实战：** `strings program.exe | grep "flag"` （做简单的逆向题经常能直接秒杀）。

* **`chmod +x`** (Change Mode)
  * **作用：** 赋予执行权限。Linux 默认下载的程序是不让你运行的。
  * **实战：** `chmod +x my_script.py` （告诉系统：这个文件是安全的，请允许我运行它）。

* **`./`**
  * **作用：** 运行当前目录下的程序。
  * **实战：** `./my_program` （注意，在 Linux 里运行当前目录的程序，前面必须加 `./`，不能直接敲名字）。



---

## formost提取指令

```bash
foremost -i <输入文件名> -o <输出目录>
```

| **参数** | **说明**                                                     | **示例**                      |
| -------- | ------------------------------------------------------------ | ----------------------------- |
| **`-i`** | **Input**: 指定要扫描的输入文件（必选）。                    | `foremost -i suspect.jpg`     |
| **`-o`** | **Output**: 指定恢复出的文件存放目录（默认是 `output`）。    | `foremost -i file -o result/` |
| **`-t`** | **Type**: 指定文件类型，缩小范围可提高效率（如 `zip`, `jpg`, `pdf`）。 | `foremost -t png -i file`     |
| **`-q`** | **Quick**: 快速模式。在每个扇区的开头查找文件头。            | `foremost -q -i disk.img`     |
| **`-k`** | **Chunk size**: 设置内存分配大小。                           | `foremost -k 512 -i file`     |
| **`-v`** | **Verbose**: 详细模式。在屏幕上打印详细的扫描过程。          | `foremost -v -i file`         |
| **`-a`** | **All**: 忽略报错，强行扫描所有能够识别的文件头。            | `foremost -a -i file`         |

**### 进阶用法示例**

1. **扫描特定类型：** 如果你知道文件里隐藏了压缩包，可以只提取 `zip` 类型，防止生成一堆没用的干扰文件：

   Bash

   ```
   foremost -t zip -i challenge.bin
   ```

2. **强制扫描所有文件（即便文件头损坏）：**

   Bash

   ```
   foremost -a -v -i evidence.raw
   ```

3. **在 CTF 流量分析中：** 当你通过 Wireshark 提取出一个较大的 `data` 或 `pcap` 数据块，但不确定里面嵌套了什么文件时，直接用 `foremost` 跑一遍是最快的“开箱”手段。

------

**### 温馨提示**

- **默认输出：** 如果你不指定 `-o`，它会在当前目录下创建一个名为 `output` 的文件夹。**如果该文件夹已存在，foremost 会报错并停止工作**，你需要先删除旧的 `output` 文件夹或换一个输出名称。
- **配合使用：** 通常先用 `file` 命令看属性，再用 `binwalk -e` 尝试自动提取，如果 `binwalk` 没提取出来，再祭出 `foremost` 进行深度扫描。

---



## zsteg指令

**1. 核心指令：一键扫描**

这是最常用的指令，它会尝试所有的通道组合（RGB, Alpha）和位平面（Bit Planes）来寻找隐藏信息：

Bash

```
zsteg <文件名.png>
```

**输出结果解析：**

- 如果看到 `b1,rgb,lsb,xy` 后面跟着 `flag{...}` 或者 `PK...`（压缩包头），说明你找对位置了。
- `b1` 表示 Bit 1（最低位），`rgb` 表示颜色通道。

---



2. 常用参数说明

| **参数** | **说明**                                                | **示例**                                      |
| -------- | ------------------------------------------------------- | --------------------------------------------- |
| **`-a`** | **All**: 尝试所有已知的检测方法（耗时较长，但最全面）。 | `zsteg -a image.png`                          |
| **`-v`** | **Verbose**: 显示更多调试信息。                         | `zsteg -v image.png`                          |
| **`-e`** | **Extract**: 提取指定通道的数据。                       | `zsteg -e b1,rgb,lsb,xy image.png -> out.bin` |
| **`-c`** | **Channels**: 指定扫描的通道（如 `r`, `g`, `b`, `a`）。 | `zsteg -c r1,g1,b1 image.png`                 |
| **`-o`** | **Order**: 指定扫描顺序（如 `xy`, `yx`）。              | `zsteg -o yx image.png`                       |

---



**3. 进阶实战：提取隐藏文件**

当你通过 `zsteg image.png` 发现某个通道（例如 `b1,rgb,lsb,xy`）里有可疑内容（比如显示这是一个 ZIP 文件）时，你需要把它提取出来：

Bash

```
# 将提取出的数据重定向到本地文件
zsteg -e b1,rgb,lsb,xy input.png > secret.zip
```



**4.为什么 `binwalk` 扫不出来，`zsteg` 能扫出来？**

这是很多新手的疑问，简单对比一下：

- **`binwalk` / `foremost`**：找的是**“块”**。它们在文件的末尾或者中间寻找另一个完整的文件头（比如在 JPG 的后面粘了一个 ZIP）。
- **`zsteg`**：找的是**“像素里的秘密”**。它分析每个像素点的二进制数值。比如把一个红色像素的 RGB 值从 `255, 0, 0` 微调成 `254, 0, 0`，肉眼看不出区别，但 `zsteg` 能识别出这少掉的 `1` 其实代表了一个二进制位。


---

## outguess解密

```bash
outguess -k '密钥' -r <带隐写的图片.jpg> <输出的文件名.txt>
```

**参数大白话翻译：**

- **`-k`** (Key)：紧跟你的密码（比如这道题里的 `'gogogo'`）。**如果题目没有密码，直接不要写 `-k` 和密码。**
- **`-r`** (Retrieve)：意思是“读取/恢复”。告诉工具我要从这张图片里把数据拿出来。
- **输出文件**：最后一个参数是你自己随意起的名字，通常写 `flag.txt` 或 `out.txt`，拿出来的东西会保存在里面。

**示例：**

```Bash
# 有密码的情况
outguess -k 'gogogo' -r mi.jpg flag.txt

# 没密码的情况（纯盲猜）
outguess -r mi.jpg flag.txt
```

---



常用辅助参数

在 CTF 比赛或实际测试中，你可能还会用到以下参数：

- **`-s`**: 设置迭代种子。如果不指定，程序会使用默认值。在某些特定题目中，调整种子可能会改变隐藏算法的行为。
- **`-i`**: 指定迭代限制，用于寻找最佳的数据嵌入位置以减少图片失真。
- **`-p`**: 传递特定的参数给目标格式的对象（通常用于微调 JPEG 的处理）。
- **`-e`**: 使用纠错编码（Error Correction），提高数据提取的可靠性，但会占用更多空间。

----

## 键盘流量解析脚本

```python
# -*- coding: utf-8 -*-
import os

# Universal HID Mapping
normal_map = {
    0x04:"a", 0x05:"b", 0x06:"c", 0x07:"d", 0x08:"e", 0x09:"f", 0x0a:"g", 0x0b:"h", 0x0c:"i", 0x0d:"j", 0x0e:"k", 0x0f:"l", 0x10:"m", 0x11:"n", 0x12:"o", 0x13:"p", 0x14:"q", 0x15:"r", 0x16:"s", 0x17:"t", 0x18:"u", 0x19:"v", 0x1a:"w", 0x1b:"x", 0x1c:"y", 0x1d:"z",
    0x1e:"1", 0x1f:"2", 0x20:"3", 0x21:"4", 0x22:"5", 0x23:"6", 0x24:"7", 0x25:"8", 0x26:"9", 0x27:"0", 0x28:"\n", 0x2c:" ", 0x2d:"-", 0x2e:"=", 0x2f:"[", 0x30:"]", 0x33:";", 0x34:"'", 0x36:",", 0x37:".", 0x38:"/", 0x2a:"[BACKSPACE]", 0x39:"[CAPSLOCK]"
}
shift_map = {
    0x04:"A", 0x05:"B", 0x06:"C", 0x07:"D", 0x08:"E", 0x09:"F", 0x0a:"G", 0x0b:"H", 0x0c:"I", 0x0d:"J", 0x0e:"K", 0x0f:"L", 0x10:"M", 0x11:"n", 0x12:"O", 0x13:"P", 0x14:"Q", 0x15:"R", 0x16:"S", 0x17:"T", 0x18:"U", 0x19:"V", 0x1a:"W", 0x1b:"X", 0x1c:"Y", 0x1d:"Z",
    0x1e:"!", 0x1f:"@", 0x20:"#", 0x21:"$", 0x22:"%", 0x23:"^", 0x24:"&", 0x25:"*", 0x26:"(", 0x27:")", 0x2d:"_", 0x2e:"+", 0x2f:"{", 0x30:"}", 0x33:":", 0x34: '\"', 0x36:"<", 0x37:">", 0x38:"?"
}

def solve():
    data_file = os.path.join(os.path.dirname(__file__), '2.2.1.txt')
    if not os.path.exists(data_file):
        print("Error: data.txt not found!")
        return

    with open(data_file, 'r') as f:
        lines = f.readlines()

    output = []
    last_key = 0
    caps_lock_on = False  # Track CapsLock state

    for line in lines:
        raw = line.strip().replace(":", "")
        if len(raw) < 16: continue
        
        mod = int(raw[0:2], 16)
        key = int(raw[4:6], 16)
        
        if key == 0: 
            last_key = 0
            continue
        if key == last_key: continue
        last_key = key
        
        # 1. Handle CapsLock Toggle
        if key == 0x39:
            caps_lock_on = not caps_lock_on
            continue

        # 2. Check Shift status
        is_shift = (mod & 0x02) or (mod & 0x20)
        
        # 3. Get Base Character
        char = ""
        if is_shift:
            char = shift_map.get(key, "")
        else:
            char = normal_map.get(key, "")

        # 4. Apply Case Logic for Letters ONLY
        if char.isalpha() and len(char) == 1:
            # If (Shift XOR CapsLock) is True, it should be Uppercase
            should_be_upper = is_shift ^ caps_lock_on
            char = char.upper() if should_be_upper else char.lower()
        
        # 5. Output Handle
        if char == "[BACKSPACE]":
            if output: output.pop()
        elif char:
            output.append(char)
            
    print("\n[+] Final Result (with CapsLock Logic):")
    print("".join(output))

solve()
```

## 鼠标流量解析脚本

```python
# -*- coding: gbk -*-
import matplotlib.pyplot as plt

def draw_mouse(file_path):
    x_coords = []
    y_coords = []
    cur_x, cur_y = 0, 0

    with open(file_path, 'r') as f:
        for line in f:
            data = line.strip().replace(':', '')
            # 如果一行数据太短，跳过
            if len(data) < 8: continue 

            # --- 关键修改区 ---
            # 情况 A (4字节): 字节0=按键, 字节1=X, 字节2=Y
            # 情况 B (8字节): 字节0=按键, 字节2=X, 字节4=Y (这在CTF中很常见)
            
            if len(data) == 8: # 4字节格式
                btn = int(data[0:2], 16)
                dx = int(data[2:4], 16)
                dy = int(data[4:6], 16)
            else: # 8字节格式，尝试取第3和第5个字节
                btn = int(data[0:2], 16)
                dx = int(data[4:6], 16)
                dy = int(data[8:10], 16)
            # ----------------

            # 有符号数转换
            if dx > 127: dx -= 256
            if dy > 127: dy -= 256

            cur_x += dx
            cur_y -= dy  

            # 只有当左键(1)或右键(2)按下时才记录坐标，防止乱码
            if btn != 0:
                x_coords.append(cur_x)
                y_coords.append(cur_y)

    if not x_coords:
        print("未提取到有效坐标，请检查数据位偏移！")
        return

    plt.figure(figsize=(10, 5))
    plt.plot(x_coords, y_coords, 'bo', markersize=2)
    plt.axis('equal')
    plt.title("Mouse Path (Filtered by Click)")
    plt.show()

draw_mouse('out.txt') # 确保文件名正确
```

## pwndbg常用指令

原生 GDB 看内存很费劲，这几个是 pwndbg 最具价值的扩充指令：

- **`tele` (telescope)**：**最重要的指令，没有之一！** 它是超级版的查看内存命令。它不仅会打印内存的数值，还会**自动解引用指针**。如果内存里存的是个地址，它会顺藤摸瓜告诉你那个地址里存的是字符串、函数还是另一个指针，极大方便了分析栈帧和 ROP 链。

  - 用法：`tele $rsp` (查看当前栈顶)、`tele $rbp 20` (从 EBP 开始往下看 20 个单位)。

- **`vmmap`**：查看当前进程的虚拟内存映射表。当你遇到上一张图里 **PIE 开启** 的情况时，用来查看代码段、libc、堆、栈的动态基址（Base Address）以及它们的读、写、执行（rwx）权限。

- **`cyclic`**：自动生成 De Bruijn 序列（一种没有重复子串的字符序列）。用于**精准计算栈溢出偏移量**。

  - 生成 50 个字符：`cyclic 50`。
  - 程序崩溃报错 `0x6161616c` 时，计算偏移：`cyclic -l 0x6161616c`（直接告诉你 Padding A 需要填多少个字节）。

  ---

  

2. 执行与断点控制

- **`b` (break)**：下断点。
  - `b main`：在 main 函数下断点。
  - `b *0x401234`：在具体的物理地址下断点（注意前面有个 `*` 星号）。
  - `b *$rebase(0x1234)`：如果开启了 PIE，用 `$rebase` 加上 IDA 里的相对偏移地址下断点。
- **`r` (run)**：运行程序。如果需要输入文件或参数，可以用 `r < payload.bin`。
- **`c` (continue)**：继续执行，直到遇到下一个断点或程序结束。
- **`ni` (next instruction)**：单步步过。执行一行汇编，遇到 `call` 直接黑盒执行完。
- **`si` (step instruction)**：单步步入。遇到 `call` 会钻进函数内部（就是咱们上一版最后剖析栈帧建立过程用的指令）。
- `d`(delete)：删除断点
  **`i b`**（`info breakpoints` 的缩写）：列出当前打的所有断点。注意看列表最左边的 **`Num`** 列，这就是断点的专属 ID

          拿到 ID 后，就可以精准清除了：

- **`d 1`**：删除编号为 1 的断点。
- **`d 1 3`**：同时删除编号为 1 和 3 的断点（中间用空格隔开）。
- **`d 2-5`**：删除编号从 2 到 5 的一段连续断点。
- **`d`**：**清空大招！** 什么数字都不加直接敲回车，会提示你是否删除**所有**断点，输入 `y` 确认即可一键清屏。



---



3. 现场上下文查看 (Context)

- **`context`**：当你清屏或者想重新看看当前状态时，输入这个指令。它会分块重新打印出 `REGISTERS`（寄存器）、`DISASM`（附近汇编代码）、`STACK`（栈顶状态）和 `BACKTRACE`（调用回溯）。
- **`stack`**：单独打印当前的栈布局。
- **`retaddr`**：专门扫描当前栈，把所有看起来像返回地址（Return Address）的值给你挑出来，找劫持点非常方便。

4. 漏洞利用辅助搜索

- **`search`**：在内存中暴力搜索特定内容，用来找 `/bin/sh` 字符串或者特定的数值。
  - 用法：`search -t string "/bin/sh"`
  - 用法：`search -p 0x400000` (搜索哪个指针指向了这个地址)。
- **`rop`**：简单的 ROP Gadget 搜索工具。
  - 用法：`rop --grep "pop rdi"`。不过实战中，大家通常更喜欢在外部用 `ROPgadget` 或 `ropper` 工具。
- **`checksec`**：不用退出 GDB，直接在 pwndbg 里检查当前程序的保护机制（Canary, NX, PIE 等）。
- **`elfheader`**：查看 ELF 文件的头部信息，比如入口点地址、GOT 表位置等。

5. 原生 GDB 必备指令 (基础但常用)

- **`x` (examine)**：基础的内存查看。
  - `x/10gx $rsp`：以 16 进制 (x)、8 字节为一个单位 (g)，打印栈顶 (rsp) 开始的 10 个数据（64位系统常用）。
  - `x/10wx $esp`：以 16 进制 (x)、4 字节为一个单位 (w)，打印 10 个数据（32位系统常用）。
  - `x/s 0x402000`：把这个地址当作字符串 (s) 打印出来。
- **`p` (print)**：打印变量或表达式的值。
  - `p/x $rax`：以十六进制打印 RAX 寄存器的值。
  - `p system`：打印 system 函数在当前内存中的真实地址（用来对抗 ASLR 和计算 libc 基址非常好用）。



---



## base64解码脚本

```python
import base64

def decode_base64(encoded_str):
    try:
        # 将字符串转换为字节，解码，然后再转换回字符串
        decoded_bytes = base64.b64decode(encoded_str.encode('utf-8'))
        return decoded_bytes.decode('utf-8')
    except Exception as e:
        return f"Base64 解码失败: {e}"

# 测试用例
if __name__ == "__main__":
    b64_text = "SGVsbG8gV29ybGQh"
    print(f"Base64 编码: {b64_text}")
    print(f"解码结果: {decode_base64(b64_text)}")
```

---



## base32解码脚本

```python
import base64

def decode_base32(encoded_str):
    try:
        # 补全等号 (Base32 长度必须是 8 的倍数，这里做简单的容错处理)
        padding = len(encoded_str) % 8
        if padding != 0:
            encoded_str += "=" * (8 - padding)
            
        decoded_bytes = base64.b32decode(encoded_str.encode('utf-8'), casefold=True)
        return decoded_bytes.decode('utf-8')
    except Exception as e:
        return f"Base32 解码失败: {e}"

# 测试用例
if __name__ == "__main__":
    b32_text = "JBSWY3DPEBLW64TMMQQQ===="
    print(f"Base32 编码: {b32_text}")
    print(f"解码结果: {decode_base32(b32_text)}")
```

---



## URL解码脚本

```python
from urllib.parse import unquote

def decode_url(url_encoded_str):
    try:
        # unquote 会自动将 %XX 转换回对应的字符
        return unquote(url_encoded_str)
    except Exception as e:
        return f"URL 解码失败: {e}"

# 测试用例
if __name__ == "__main__":
    url_text = "https%3A%2F%2Fwww.google.com%2Fsearch%3Fq%3D%E6%B5%8B%E8%AF%95"
    print(f"URL 编码: {url_text}")
    print(f"解码结果: {decode_url(url_text)}")
```

---



## 进制转化脚本

```python
def convert_base(num_str, from_base, to_base):
    try:
        # 1. 先将原始字符串按原进制转换为十进制整数
        base10_num = int(str(num_str), from_base)
        
        # 如果是 0，直接返回
        if base10_num == 0:
            return "0"
            
        # 2. 将十进制整数转换为目标进制
        digits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        result = ""
        is_negative = base10_num < 0
        base10_num = abs(base10_num)
        
        while base10_num > 0:
            result = digits[base10_num % to_base] + result
            base10_num //= to_base
            
        return "-" + result if is_negative else result

    except ValueError:
        return "转换失败：输入的数字或进制不合法"

# 测试用例
if __name__ == "__main__":
    # 将十六进制的 FF 转换为二进制
    hex_val = "FF"
    print(f"十六进制 {hex_val} 转换为二进制: {convert_base(hex_val, 16, 2)}")
    
    # 将二进制的 1010 转换为十进制
    bin_val = "1010"
    print(f"二进制 {bin_val} 转换为十进制: {convert_base(bin_val, 2, 10)}")
    
    # 将十进制的 255 转换为八进制
    dec_val = "255"
    print(f"十进制 {dec_val} 转换为八进制: {convert_base(dec_val, 10, 8)}")
```

```md wrap
持续更新，欢迎各位的补充
```

