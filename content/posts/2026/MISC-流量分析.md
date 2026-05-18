---
title: MISC-流量分析
description: 简简单单的misc入门题目。
date: 2026-05-17 17:40:32
updated: 2026-05-17 17:40:32
image: https://images.cnblogs.com/cnblogs_com/blogs/860797/galleries/2492655/o_260517095247_1714468259606_compressed.jpg
categories: [安全]
tags: [Misc]
recommend: 10
path: /2026/misc-traffic-analysis
---

### MISC-流量分析

## NSSCTF-MISC

### MISC-流量分析(SQL注入-布尔盲注)

>**布尔盲注（Boolean-based Blind SQL Injection）**是 SQL 注入中非常经典且重要的一种手法。
>
>如果用一句话概括：**它就像是在和数据库玩一场只能回答“是”或“否”的“二十个问题”游戏。**
>
>当常规的注入方法（如联合查询注入）失效时，布尔盲注往往是黑客和安全研究员的利器。以下是为你整理的知识点，语言尽量严谨客观，方便你作为技术文档或学习笔记的参考：
>
>---
>
>
>
>1. 核心概念与适用场景
>
>- **无回显限制：** 在很多安全的 Web 应用中，即便程序存在 SQL 注入漏洞，后端也不会把数据库的查询结果（如用户名、密码）直接回显在前端网页上，同时也会屏蔽掉数据库的报错信息。
>- **状态的二元性（布尔特征）：** 网页虽然不给数据，但它对 SQL 语句的“真（True）”和“假（False）”会呈现出两种不同的状态。
>- **当注入的 SQL 逻辑为真时：** 页面正常加载，或者显示某个特定的标志（如“查询成功”、“Welcome”）。
>- **当注入的 SQL 逻辑为假时：** 页面显示缺失、出现通用错误提示，或者缺少某个特定标志（如“查无此人”）。
>- **攻击本质：** 攻击者通过构造包含逻辑判断（如 `>`、`<`、`=`）的 SQL 语句，观察网页的响应状态（True 或 False），从而一个字符一个字符地“猜”出数据库里的敏感信息。
>
>---
>
>
>
>2. 核心必备函数（以 MySQL 为例）
>
>要完成这种“猜字游戏”，需要配合以下几个常用的 SQL 内置函数来精细化提取数据：
>
>- **`length(str)`**：返回字符串的长度。
>- *用途：* 先猜出数据库名或密码有多长，确定循环猜解的次数。
>- **`substr(str, pos, len)`** 或 **`substring()`** / **`mid()`**：截取字符串。
>- *用途：* 把长字符串切成单个字符，方便逐个攻破。（注意：SQL 里的字符串索引通常从 `1` 开始，而不是 `0`）。
>- **`ascii(char)`** 或 **`ord(char)`**：将单个字符转换为对应的 ASCII 码（数字）。
>- *用途：* 字符不好直接比对大小，转成数字后，就可以结合二分法（大于、小于判断）大幅提高猜解效率。
>
>---
>
>
>
>3. 攻击的标准流程拆解
>
>布尔盲注的推演过程非常讲究逻辑顺序，通常分为以下几个步骤：
>
>**第一步：寻找注入点并确认布尔状态** 输入 `id=1' and 1=1 --+` （页面正常，True） 输入 `id=1' and 1=2 --+` （页面异常或内容消失，False） *结论：存在布尔盲注漏洞。*
>
>**第二步：猜解目标数据的长度** 假设我们要猜数据库的名称（`database()`）： 构造：`id=1' and length(database())=8 --+` 如果页面返回正常（True），说明数据库名字刚好是 8 个字符。如果不正常，就继续试其他数字（如 `>`, `<`）。
>
>**第三步：逐个字符猜解数据（利用二分法）** 知道了长度为 8，接下来猜第一个字符： 构造：`id=1' and ascii(substr(database(), 1, 1)) > 100 --+`
>
>- 如果页面正常（True），说明第一个字符的 ASCII 码大于 100。
>- 继续缩小范围：`... > 110`，`... < 120`，直到最终定位到 `... = 115`（对应的字母是 's'）。
>- 第一个字符猜出后，修改 `substr()` 的第二个参数为 2，继续猜第二个字符，直到 8 个字符全部猜完。
>
>---
>
>
>
>**第四步：层层递进提取核心数据** 按照同样的“长度探测 -> 逐字猜解”逻辑，依次获取：
>
>1. 当前数据库名
>2. 数据库里的所有表名 (`information_schema.tables`)
>3. 目标表里的所有列名 (`information_schema.columns`)
>4. 目标列中的具体数据（如账号密码）。
>
>



#### [闽盾杯 2021]日志分析

题目链接：[闽盾杯 2021\]日志分析 - NSSCTF](https://www.nssctf.cn/problem/939)

![image-20260304114236784](https://img2024.cnblogs.com/blog/3726946/202603/3726946-20260304115051987-617054276.png)

打开附件发现大量的%url编码，先转化一下观察

![image-20260304114332227](https://img2024.cnblogs.com/blog/3726946/202603/3726946-20260304115049202-1352241282.png)

> 0x00 前言

在 CTF 比赛中，流量分析是常见题型。当我们拿到一份 Web 服务器日志（如 `access.log`）时，如果发现大量相似且带有 SQL 关键字的请求，通常意味着网站遭受了 SQL 注入攻击。本文将手把手教你如何从这些杂乱的日志中“还原”出被黑客窃取的 Flag。

------

> **0x01 第一步：环境感知（找寻判别准则）**

黑客进行的是**布尔盲注**。这种攻击就像是在玩“海龟汤”，黑客问一个是非题，服务器只能通过页面反馈来回答“对”或“错”。

首先，我们要找到服务器回答“对”和“错”时的不同表现。观察 `access.log` 开头：

- **正常请求**：`id=1` 返回长度为 **675**。
- **真值探测**：`id=1' AND 7113=7113`（恒等式，必为真）返回长度为 **675**。
- **假值探测**：`id=1' AND 2512=1676`（必为假）返回长度为 **678**。

**关键结论：**

- **HTTP 200 675** 代表 SQL 条件为 **真 (True)**
- **HTTP 200 678** 代表 SQL 条件为 **假 (False)**

------

> **0x02 第二步：逻辑拆解（黑客是怎么猜的？）**

黑客使用 sqlmap 工具，利用 `ORD(MID())` 函数配合**二分查找法**来获取数据。

**以提取密码（password）第 1 个字符为例：**

1. `...MID(...,1,1))>110` $\rightarrow$ 返回 **678 (假)**：说明该字符 ASCII 值 **$\le$ 110**。
2. `...MID(...,1,1))>109` $\rightarrow$ 返回 **675 (真)**：说明该字符 ASCII 值 **$>$ 109**。
3. **推导**：大于 109 且小于等于 110 的整数只有一个，那就是 **110**。
4. **转化**：查 ASCII 码表，110 对应字母 **`n`**。

------

> **0x03 第三步：自动化脚本（从日志到 Flag）**

由于日志有上千行，手动提取不现实。我们需要写一个脚本完成三件事：**URL解码**->**正则匹配** -> **逻辑还原**。

**Python 脚本参考：**

```python
import urllib.parse
import re

def extract_flag_from_log(file_path):
    # 存储结果：{字符位置: 最大的 True 判定 ASCII 值}
    # 逻辑：如果 MID(...) > X 为真 (675)，则该位字符 ASCII >= X+1
    results = {}
    
    # 正则表达式：匹配解码后的 password 盲注语句
    # 捕获组：1=位置, 2=比较的ASCII值, 3=响应长度
    pattern = re.compile(r"password.*?,(\d+),1\)\)>(\d+).*? 200 (\d+)")

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                # 1. 先进行全局 URL 解码
                decoded_line = urllib.parse.unquote(line)
                
                # 2. 匹配关键信息
                match = pattern.search(decoded_line)
                if match:
                    pos = int(match.group(1))      # MID 截取的字符位置
                    threshold = int(match.group(2)) # 比较的数值 X
                    resp_len = int(match.group(3)) # 长度 (675/678)
                    
                    # 3. 核心判定逻辑：675 为真 (True)
                    if resp_len == 675:
                        # 记录该位置出现的最大的“真”阈值
                        if pos not in results or threshold > results[pos]:
                            results[pos] = threshold

        # 4. 排序并还原字符
        if not results:
            print("未发现匹配的布尔盲注数据，请检查日志格式。")
            return

        sorted_positions = sorted(results.keys())
        final_flag = ""
        
        print(f"{'位置':<6} | {'最大 True 阈值':<15} | {'判定字符'}")
        print("-" * 40)
        
        for p in sorted_positions:
            char_ascii = results[p] + 1
            char = chr(char_ascii)
            final_flag += char
            print(f"{p:<8} | {results[p]:<15} | {char}")

        print("-" * 40)
        print(f"最终识别出的 Flag: {final_flag}")

    except FileNotFoundError:
        print(f"错误：找不到文件 {file_path}")

if __name__ == "__main__":
    # 指定你的文件名
    extract_flag_from_log('access.log')//得换你的log名称哈，别直接跑了

```



------

**0x04 总结**

1. **解码是前提**：Web 日志会对特殊字符编码，不解码就看不出 SQL 语句。
2. **长度是灵魂**：布尔盲注的本质就是观察响应长度的微小差异。
3. **最后一位 + 1**：由于黑客用的是 `> X` 判定，所以我们找到的最后一个“真”的值 `X`，其实目标字符就是 `X + 1`。

---



> **为什么是布尔盲注?**

1. 看“长相”：重复且规律的请求

当你打开 `access.log`，发现黑客不是在翻阅不同的页面，而是在**疯狂刷新同一个地址**，且参数极其相似时，就要怀疑是盲注了。

- **普通用户**：访问 `/index.php`，然后访问 `/news.php`。
- **黑客（盲注）**：连续发送几百个 `/api/forum.php/?id=1...`，只有最后面的那一小段代码在变。

---



2. 看“核心”：标志性的 SQL 函数

在日志中，如果我们看到了以下三个函数组合出现，那几乎可以“秒定”是布尔盲注：

- **`MID()` 或 `SUBSTR()`**：这是“切片刀”，负责把密码切成一个一个的字母。
- **`ORD()` 或 `ASCII()`**：这是“转换器”，负责把字母变成数字（比如把 'a' 变成 97）。
- **`> 某个数字`**：这是“问句”，负责问服务器：“这个字母的 ASCII 码是不是大于 100？”



---



3. 看“反馈”：响应长度的二元变化

这是最关键的一点！**“布尔”的意思就是“非黑即白”**。

在日志的末尾，你会发现无论黑客怎么变换参数，服务器返回的状态码永远是 `200`（代表请求成功），但是**返回的页面长度（Length）却只有两种结果**：

- **结果 A**：675
- **结果 B**：678

这就好比你在问服务器问题，它不说话，但如果你问对了，它点一下头（返回 675）；如果你问错了，它摇一下头（返回 678）。

----



#### [鹤城杯 2021]流量分析

[[鹤城杯 2021\]流量分析 - NSSCTF](https://www.nssctf.cn/problem/454)

示例代码

```shell
tshark -r timu.pcapng  -e http.request.uri -T fields -Y 'http.request.uri' > 1.txt
```

脚本

```c
##include<stdio.h>
##include<stdlib.h>
##include<string.h>

int main()
{
    FILE* file = fopen("1.txt","r");
    if(file == NULL)
    {
        printf("无法打开1.txt文件,检查是否 存在");
        return 1;
    }
    char line[1024];
    int flag;

    while(fgets(line,sizeof(line),file)){
        char* pos = strstr(line,"))=");
        if(pos!=NULL)
        {
            int num = atoi(pos + 3);
            if(num>flag) flag = num;
            else{
                printf("%c",flag);
                flag = -1;
            }
        }
    }
    fclose(file);
    
    return 0;
}
```

---



### MISC-流量分析USB流量

> USB 键盘属于 HID（Human Interface Device，人机交互设备）。当我们敲击键盘时，键盘会向电脑发送一段特定格式的数据报文（通常被抓包保存为 `.pcap` 或 `.pcapng` 文件）。你的任务就是把这些底层的数据包还原成人类可读的按键记录
>
> 以下是为你梳理的 USB 键盘流量分析核心知识点：
>
> 
>
> 1. **核心原理：8 字节报文结构**
>
> 在 Wireshark 中分析键盘流量时，最关键的数据部分通常被称为 `usb.capdata` 或 `usbhid.data`。键盘发送的一个标准数据包固定为 **8 个字节（Bytes）**，它的结构有着极其严格的规定：
>
> | **字节位置**   | **含义说明**                   | **详细解析**                                                 |
> | -------------- | ------------------------------ | ------------------------------------------------------------ |
> | **Byte 0**     | **控制键状态 (Modifier Keys)** | 记录 Shift、Ctrl、Alt 等键是否被按下。例如：`0x02` 或 `0x20` 代表按下了 Shift 键（这意味着后面的字母是大写，或者按下了符号键）。 |
> | **Byte 1**     | **保留位 (Reserved)**          | 通常恒为 `0x00`。                                            |
> | **Byte 2 - 7** | **普通按键的键码 (Keycodes)**  | 记录具体按下了哪个键。最多允许同时按下 6 个键。通常我们只需要关注 Byte 2。 |
>
> 
>
> 举个例子：
>
> 如果抓到的底层数据是 `02 00 04 00 00 00 00 00`：
>
> - `02` (Byte 0)：表示按下了 Left Shift。
> - `04` (Byte 2)：在 USB HID 映射表中，`04` 代表字母 `a`。
> - **综合结果：** 这一帧流量代表用户输入了是大写字母 `A`。
>
> ---
>
> **2. 标准的解题流程**
>
> 面对一个包含键盘流量的 pcap 文件，通常分为“提取”和“解析”两步：
>
> 
>
> **第一步：使用 tshark 提取底层数据**
>
> 你可以直接在你的 WSL 终端里使用强大的命令行抓包工具 `tshark`，将 pcap 文件中的 8 字节 Hex 数据批量剥离出来。
>
> 常用的提取命令如下：
>
> 
>
> ```
> # 提取 usbhid.data 字段并保存到文本中
> tshark -r keyboard.pcap -T fields -e usbhid.data > hex_data.txt
> ```
>
> *(注：由于 Wireshark 版本的不同，有时候目标字段可能是 `usb.capdata`，可以先在图形化界面里确认一下字段名)*
>
> 提取出来的 `hex_data.txt` 里面会是密密麻麻的 16 进制字符串，类似这样：
>
> ```Plaintext
> 00:00:0c:00:00:00:00:00
> 02:00:04:00:00:00:00:00
> 00:00:00:00:00:00:00:00
> ...
> ```
>
> 
>
> **第二步：编写脚本还原明文**
>
> 拿到这些 Hex 数据后，我们需要通过查阅 **USB HID Usage Tables**（USB 按键映射表），把 16 进制转回字符。
>
> 例如：`0x04` -> `a/A`，`0x1e` -> `1/!` 等等。
>
> 在转换时，必须写逻辑判断 **Byte 0** 是否包含 Shift 键的标志，以此来决定输出大写还是小写。



#### [CISCN 2022 初赛]ez_usb

赛题地址:https://www.nssctf.cn/problem/2346

![image-20260411182519758](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260411190950778-1967447275.png)

这题是一道经典的USB流量


**核心知识点：** 标准 USB 键盘每次按下按键时，上报的数据包长度固定为 **8 个字节**。
在 Wireshark 中，点开 `USB URB` 层，观察 `URB Data Length` 字段是否为 8

通过wireshark-统计-端口-USB发现
`host`、`2.10.1`、`2.4.1`、`2.8.1`

这四个地址的大小和分组最多，host是主机，那么剩下三个是外接设备。
![image-20260411183436874](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260411190950284-538246806.png)

使用规则进行查找

```lua
usb.addr == "2.4.1"
```

![image-20260411183729282](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260411190949814-1914423465.png)

主要分析的是HID Data数据


>当你在键盘上敲下一个字母 `A` 的时候，键盘并不会只把一个单纯的 `A` 扔给电脑。为了保证这个数据能准确无误地传给操作系统，USB 协议会给这个字母**里三层外三层地打包**。
>
>一个完整的 USB 数据包，其实分为两大部分：
>
>- **外包装（协议头 / Headers / URB 等）：** 这就好比快递盒子上的**快递面单**。里面写满了：寄件人是谁（设备地址 `2.8.1`）、收件人是谁（电脑主板的某个端口）、包裹有多重（`Data Length: 8`）、用的什么快递公司（协议版本）等等。 这些信息是给**电脑的底层硬件和操作系统**看的。电脑靠这些信息来分发数据，但这些信息里**绝对不包含**你具体按了什么键。
>- **包裹里的物品（载荷 / Payload / HID Data）：** 这就好比快递盒子里装的那封**信**。这 8 个字节（比如 `00 00 04 00 00 00 00 00`），就是键盘纯粹的物理状态报告，也就是我们心心念念的 `HID Data`。

![image-20260411183912840](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260411190949378-2023607167.png)

随便查看几个2.4.1传给host数据，基本上都是00 00 00 00 00 00 00 （7字节）
说明基本上这个2.4.1是一个空置设备或者说不是常见的鼠标和键盘外设，作为一个干扰项目

那咱就分析2.8.1和2.10.1嘛

![image-20260411184850912](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260411190948889-340307082.png)

![image-20260411184909969](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260411190948405-1911091941.png)

像那么一回事了，那就通过命令批量提取。分别对这两个usb地址导出特定分组
![image-20260411185024617](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260411190947786-823287115.png)

---

**0x03 第三步：翻译天书，编写 Python 解密脚本**
Wireshark 适合肉眼观察，但不适合大批量复制数据。
我们要祭出它的命令行兄弟工具——**`tshark`**。 在 Linux 终端（或 WSL）中输入以下命令，将底层包含按键信息的 16 进制数据（`usbhid.data`）单独提取并保存为 txt 文本。

2.8.1设备提取


```shell
tshark -r ez_usb.pcapng -T fields -e usbhid.data -Y "usb.device_address == 8" > 281.txt
```


2.10.1设备提取

```shell
tshark -r ez_usb.pcapng -T fields -e usbhid.data -Y "usb.device_address == 10" > 2101.txt
```

导出的 `txt` 文件里是一行行的 8 字节十六进制代码（如 `0000040000000000`）。根据 USB HID 协议字典，第 3 个字节（即 `04`）代表敲击了字母 `A`。

为了防止中文字符引发系统编码报错，我们编写一个纯英文字符的 Python 脚本，让程序自动帮我们“查字典”，把十六进制还原为人类能看懂的字符。

```python
##v1.0
## -*- coding: utf-8 -*-
usb_codes = {
    0x04:"a", 0x05:"b", 0x06:"c", 0x07:"d", 0x08:"e", 0x09:"f", 0x0A:"g", 0x0B:"h", 0x0C:"i", 0x0D:"j", 0x0E:"k", 0x0F:"l", 0x10:"m", 0x11:"n", 0x12:"o", 0x13:"p", 0x14:"q", 0x15:"r", 0x16:"s", 0x17:"t", 0x18:"u", 0x19:"v", 0x1A:"w", 0x1B:"x", 0x1C:"y", 0x1D:"z",
    0x1E:"1", 0x1F:"2", 0x20:"3", 0x21:"4", 0x22:"5", 0x23:"6", 0x24:"7", 0x25:"8", 0x26:"9", 0x27:"0", 0x2A:"[DEL]"
}

def decode_keystrokes(file_path):
    with open(file_path, 'r') as f:
        lines = f.readlines()

    result = []
    last_keycode = 0
    for line in lines:
        line = line.strip().replace(":", "").replace(" ", "")
        if not line or len(line) < 16:
            continue
        
        keycode = int(line[4:6], 16) # 提取第3个字节
        
        if keycode == 0:
            last_keycode = 0
            continue
        if keycode == last_keycode:
            continue
            
        last_keycode = keycode
        
        if keycode in usb_codes:
            char = usb_codes[keycode]
            if char == '[DEL]' and result:
                result.pop() # 处理退格键
            else:
                result.append(char)
                
    return "".join(result).replace("[TAB]", "")

print("Keyboard 2.8.1:")
print(decode_keystrokes('2.8.1.txt'))
print("\nKeyboard 2.10.1:")
print(decode_keystrokes('2.10.1.txt'))

```

```python
##v2脚本
## -*- coding: utf-8 -*-
import os

## ==============================================================================
## CTF Universal USB Keyboard Traffic Decoder
## ==============================================================================

## [1. DICTIONARIES] 
## Normal keys (No Shift)
normal_keys = {
    0x04:"a", 0x05:"b", 0x06:"c", 0x07:"d", 0x08:"e", 0x09:"f", 0x0A:"g", 0x0B:"h", 0x0C:"i", 0x0D:"j", 0x0E:"k", 0x0F:"l", 0x10:"m", 0x11:"n", 0x12:"o", 0x13:"p", 0x14:"q", 0x15:"r", 0x16:"s", 0x17:"t", 0x18:"u", 0x19:"v", 0x1A:"w", 0x1B:"x", 0x1C:"y", 0x1D:"z",
    0x1E:"1", 0x1F:"2", 0x20:"3", 0x21:"4", 0x22:"5", 0x23:"6", 0x24:"7", 0x25:"8", 0x26:"9", 0x27:"0",
    0x28:"\n", 0x2A:"[DEL]", 0x2B:"[TAB]", 0x2C:" ", 0x2D:"-", 0x2E:"=", 0x2F:"[", 0x30:"]", 0x31:"\\", 0x33:";", 0x34:"'", 0x35:"`", 0x36:",", 0x37:".", 0x38:"/"
}

## Shifted keys (When Shift is pressed)
shift_keys = {
    0x04:"A", 0x05:"B", 0x06:"C", 0x07:"D", 0x08:"E", 0x09:"F", 0x0A:"G", 0x0B:"H", 0x0C:"I", 0x0D:"J", 0x0E:"K", 0x0F:"L", 0x10:"M", 0x11:"N", 0x12:"O", 0x13:"P", 0x14:"Q", 0x15:"R", 0x16:"S", 0x17:"T", 0x18:"U", 0x19:"V", 0x1A:"W", 0x1B:"X", 0x1C:"Y", 0x1D:"Z",
    0x1E:"!", 0x1F:"@", 0x20:"#", 0x21:"$", 0x22:"%", 0x23:"^", 0x24:"&", 0x25:"*", 0x26:"(", 0x27:")",
    0x28:"\n", 0x2A:"[DEL]", 0x2B:"[TAB]", 0x2C:" ", 0x2D:"_", 0x2E:"+", 0x2F:"{", 0x30:"}", 0x31:"|", 0x33:":", 0x34:"\"", 0x35:"~", 0x36:"<", 0x37:">", 0x38:"?"
}

## [2. CORE DECODER FUNCTION]
## filter_control: Set to True to extract pure hex (ignores TAB, F1, etc.)
## filter_control: Set to False to see EVERYTHING the hacker typed
def decode_usb_traffic(file_path, filter_control=True):
    if not os.path.exists(file_path):
        return f"[!] Error: File not found -> {file_path}"

    with open(file_path, 'r') as f:
        lines = f.readlines()

    result = []
    last_keycode = 0
    
    for line in lines:
        # Clean up the format (e.g., "00:00:1e..." -> "00001e...")
        line = line.strip().replace(":", "").replace(" ", "")
        
        # Valid USB HID data length is usually 16 chars (8 bytes)
        if not line or len(line) < 16:
            continue
            
        # Byte 0: Modifier keys (Shift, Ctrl, Alt)
        mod_byte = int(line[0:2], 16)
        
        # Byte 2: Actual key pressed (Index 4:6 in string)
        keycode = int(line[4:6], 16)
        
        # Key release or no key pressed
        if keycode == 0:
            last_keycode = 0
            continue
            
        # Ignore holding down the same key
        if keycode == last_keycode:
            continue
            
        last_keycode = keycode
        
        # Check if Left Shift (0x02) or Right Shift (0x20) is pressed
        is_shift = (mod_byte == 0x02) or (mod_byte == 0x20)
        
        # Look up the character in dictionaries
        if is_shift:
            char = shift_keys.get(keycode, "")
        else:
            char = normal_keys.get(keycode, "")
                
        # Handle Backspace
        if char == '[DEL]':
            if result:
                result.pop()
        # Handle Control Keys (like TAB, F1, etc.)
        elif char.startswith('['):
            if filter_control:
                pass # Ignore it to keep data clean
            else:
                result.append(char) # Keep it for detailed analysis
        else:
            result.append(char)
            
    return "".join(result)

## [3. HOW TO USE / EXECUTION]
if __name__ == '__main__':
    # Auto-locate current folder
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # --- Put your target text files here ---
    target_file1 = '2.8.1.txt' # Change this to your file name
    full_path = os.path.join(current_dir, target_file1)

    
    print(f"[*] Analyzing: {target_file1}")

    #print(f"[*] Analyzing: {target_file}")
    # Mode 1: Pure Data Mode (Best for Hex/Passwords)
    print("\n[+] Mode: Clean Output (No TAB/F1)")
    print(decode_usb_traffic(full_path, filter_control=True))
    
    # Mode 2: Full Record Mode (Best for analyzing hacker behavior)
    # print("\n[+] Mode: Full Record (Includes TAB/F1)")
    # print(decode_usb_traffic(full_path, filter_control=False))
```





---



**0x04 第四步：局中局，发现隐藏的压缩包**
运行脚本后，我们得到了两个截然不同的结果：

- **键盘 2.10.1 敲击结果：** `35c535765e50074a`
- **键盘 2.8.1 敲击结果：** `526172211a0700cf907300000d00000000...` (一大串十六进制字符)

**分析：** 10 号键盘敲出来的明显是一段**密码**。 而 8 号键盘敲出来的字符，开头是 `52617221`。对文件头敏感的同学立刻就能反应过来，这是 `Rar!` 的十六进制文件头。继续往后看，还能在一堆乱码中看到 `666c61672e747874`（十六进制的 `flag.txt`）。 原来，出题人通过 8 号键盘，**纯手工敲入了一个完整的 RAR 压缩包的底层十六进制代码**！

---



**0x05 第五步：移花接木，还原 RAR 获取 Flag**

我们只需要写两行 Python 代码，就能把 8 号键盘敲出来的这串长长的字母，重新转换回原本的 `.rar` 二进制文件格式。

```python
import binascii

## 将2.8.1解密出来的那一大串十六进制直接贴在这里，末尾补一个0以防丢位
hex_data = "526172211a070...此处省略...0400700e0" 

## 写入为rar压缩文件
with open('flag_archive.rar', 'wb') as f:
    f.write(binascii.unhexlify(hex_data))
```

也可以使用010Editor
将2.8.1复制到.txt文件，然后使用010导入16进制，保存文件格式是.rar文件

![image-20260411185642306](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260411190946789-1380385822.png)

最后解析出的结果是

> flag{20de17cc-d2c1-4b61-bebd-41159ed7172d}}

---

#### [NISACTF 2022]破损的flag

题目链接:[[NISACTF 2022\]破损的flag - NSSCTF](https://www.nssctf.cn/problem/2048)
这题也是很简单的一题USB流量，而且利用上面的思路的话就应该能写出来

![image-20260412154949161](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260412172351627-818634396.png)

依旧利用端点查看设备
![image-20260412155250939](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260412172350916-1019641058.png)

查看DATA信息，用tshark提取

![image-20260412155314936](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260412172346359-1464188878.png)

```bash
tshark -r data.pcapng -T fields -e usb.capdata > out.txt
```

利用解密脚本解析

```python
## -*- coding: utf-8 -*-
import os

## Universal HID Mapping
normal_map = {
    0x04:"a", 0x05:"b", 0x06:"c", 0x07:"d", 0x08:"e", 0x09:"f", 0x0a:"g", 0x0b:"h", 0x0c:"i", 0x0d:"j", 0x0e:"k", 0x0f:"l", 0x10:"m", 0x11:"n", 0x12:"o", 0x13:"p", 0x14:"q", 0x15:"r", 0x16:"s", 0x17:"t", 0x18:"u", 0x19:"v", 0x1a:"w", 0x1b:"x", 0x1c:"y", 0x1d:"z",
    0x1e:"1", 0x1f:"2", 0x20:"3", 0x21:"4", 0x22:"5", 0x23:"6", 0x24:"7", 0x25:"8", 0x26:"9", 0x27:"0", 0x28:"\n", 0x2c:" ", 0x2d:"-", 0x2e:"=", 0x2f:"[", 0x30:"]", 0x33:";", 0x34:"'", 0x36:",", 0x37:".", 0x38:"/", 0x2a:"[BACKSPACE]", 0x39:"[CAPSLOCK]"
}
shift_map = {
    0x04:"A", 0x05:"B", 0x06:"C", 0x07:"D", 0x08:"E", 0x09:"F", 0x0a:"G", 0x0b:"H", 0x0c:"I", 0x0d:"J", 0x0e:"K", 0x0f:"L", 0x10:"M", 0x11:"n", 0x12:"O", 0x13:"P", 0x14:"Q", 0x15:"R", 0x16:"S", 0x17:"T", 0x18:"U", 0x19:"V", 0x1a:"W", 0x1b:"X", 0x1c:"Y", 0x1d:"Z",
    0x1e:"!", 0x1f:"@", 0x20:"#", 0x21:"$", 0x22:"%", 0x23:"^", 0x24:"&", 0x25:"*", 0x26:"(", 0x27:")", 0x2d:"_", 0x2e:"+", 0x2f:"{", 0x30:"}", 0x33:":", 0x34: '\"', 0x36:"<", 0x37:">", 0x38:"?"
}#密码本

def solve():
    data_file = os.path.join(os.path.dirname(__file__), 'out.txt')#就改写这里的参数就行
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

解析出这些东西

> ujkonjk,tfvbhyhjipokrdcvgrdcvgpokqwsztfvbhujkowazxdqasewsdrpokxdfviklpnjkwsdrrfgyrdcvguhnmkbhjmyhji

涉及到一个知识点
键盘包围密码

>**键盘包围密码**（Keyboard Surround Cipher）是一种在 CTF（夺旗赛）杂项（Misc）或密码学（Crypto）题目中常见的**视觉型物理密码**。
>
>它不依赖复杂的数学算法，而是利用了计算机键盘的**物理布局**。

假设你收到一串密文：`qweasdzxc`

我们低头看键盘，把这些字母连起来：

- 第一排：**Q W E**
- 第二排：**A S D**
- 第三排：**Z X C**

这 9 个键在键盘上形成了一个 3x3 的方阵。你会发现，这个方阵的正中心那个键是 **`S`**。 因此，这段密文对应的明文就是：**`S`**。

有时候出题人会更调皮一点，故意把正中间的字母扣掉。比如给出 `qwedcxza`，你在键盘上顺着这些字母划一圈，发现它们绕着 **`S`** 跑了一圈，答案依然是 **`S`**。

---

**如何一眼识破它？**

当你看到一串满足以下特征的字符时，基本就可以确定键盘密码了：

1. **毫无语义**：字母组合完全无法发音，也不像常见的 Base64 或 Hex。
2. **物理聚集**：密文里的字母在键盘上的物理位置都挨得非常近。
3. **题目提示**：题目名包含“围城”、“圈圈”、“低头族”、“QWERTY”等暗示。

当你看到一串满足以下特征的字符时，基本就可以确定是键盘密码了：

1. **毫无语义**：字母组合完全无法发音，也不像常见的 Base64 或 Hex。
2. **物理聚集**：密文里的字母在键盘上的物理位置都挨得非常近。
3. **题目提示**：题目名包含“围城”、“圈圈”、“低头族”、“QWERTY”等暗示。



解密脚本

```python
## -*- coding: utf-8 -*-

## 1. Define the exact mapping based on the keyboard shape
## This bypasses the mathematical errors and maps the "circle" directly to the "center"
mapping = {
    "ujko": "i",
    "njk,": "m",    # Handled the tricky comma!
    "tfvbh": "g",
    "yhji": "u",
    "pok": "l",     # Math thinks it's 'o', but we humanly know it surrounds 'l'
    "rdcvg": "f",
    "qwsz": "a",
    "wazxd": "s",
    "qasew": "w",
    "sdr": "e",
    "xdfv": "c",
    "iklp": "o",
    "njk": "m",     # The version without comma
    "wsdr": "e",
    "rfgy": "t",
    "uhnm": "j",
    "kbhj": "n",
    "myhji": "u"
}

def decode_greedy(ciphertext):
    result = ""
    i = 0
    
    print("[*] Starting Greedy Decoder...")
    
    while i < len(ciphertext):
        match_found = False
        
        # Greedy search: try longer matches first (from 6 down to 3)
        # Because "njk," (4) should match before "njk" (3)
        for length in range(6, 2, -1):
            chunk = ciphertext[i : i+length]
            
            if chunk in mapping:
                char = mapping[chunk]
                print("Found chunk: {:<8} -> Decoded: {}".format(chunk, char))
                result += char
                i += length
                match_found = True
                break
                
        if not match_found:
            print("[!] Error: Cannot parse the chunk starting at: {}".format(ciphertext[i:i+5]))
            break
            
    print("\n[+] Final Flag:")
    print(result)
    return result

## The raw ciphertext from your traffic capture
cipher = "ujkonjk,tfvbhyhjipokrdcvgrdcvgpokqwsztfvbhujkowazxdqasewsdrpokxdfviklpnjkwsdrrfgyrdcvguhnmkbhjmyhji"

decode_greedy(cipher)
```

结果是

>imgulfflagiswelcometfjnu

根据题目意思，这个是一个破损的flag，提示需要补齐单词

>NSSCTF{welcome_to_fjnu}

---

#### [MoeCTF 2022]usb

题目链接:[[MoeCTF 2022\]usb - NSSCTF](https://www.nssctf.cn/problem/3311)

这题就更加简单了

使用tshark和解析上面的解析脚本都行

![image-20260412160918821](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260412172330832-2063594185.png)

```bash
tshark -r usb.pcapng -T fields -e usbhid.data > 2.2.1.txt
```

解析脚本

```python
## -*- coding: utf-8 -*-
import os

## Universal HID Mapping
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

> flag:
> NSSCTF{Learned_a6ou7_USB_tr@ffic}

---

#### [SWPU 2020]来猜谜了

题目链接:[[SWPU 2020\]来猜谜了 - NSSCTF](https://www.nssctf.cn/problem/49)
我觉得最难崩的一题,有个晚上搞了2个小时解密，发现这个◢▆▅▄▃崩╰(〒皿〒)╯潰▃▄▅▇◣
![img](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260412172315624-1444774956.png)

![image-20260412162515672](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260412172313617-1338161127.png)

拿到附件是一个图片，通过binwalk,foremost，010分析都可以发现就是一个图片，StegSolve各种通道都找不到信息。

不过有趣的是zsteg发现了隐写通道

![image-20260412162743783](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260412172301778-1365216875.png)

使用

```bash
zsteg -e b1,rgb,lsb,xy problem.png > out.zip
```

获取到mi.jpg和uuu.pcap

pcap是一个USB键盘流量

通过脚本解析

tshark拿出二进制

```bash
tshark -r uuu.pacapng -T fields -e usb.capdata > out.txt
```

脚本解析键盘信息

```python
## -*- coding: utf-8 -*-
import os

## Universal HID Mapping
normal_map = {
    0x04:"a", 0x05:"b", 0x06:"c", 0x07:"d", 0x08:"e", 0x09:"f", 0x0a:"g", 0x0b:"h", 0x0c:"i", 0x0d:"j", 0x0e:"k", 0x0f:"l", 0x10:"m", 0x11:"n", 0x12:"o", 0x13:"p", 0x14:"q", 0x15:"r", 0x16:"s", 0x17:"t", 0x18:"u", 0x19:"v", 0x1a:"w", 0x1b:"x", 0x1c:"y", 0x1d:"z",
    0x1e:"1", 0x1f:"2", 0x20:"3", 0x21:"4", 0x22:"5", 0x23:"6", 0x24:"7", 0x25:"8", 0x26:"9", 0x27:"0", 0x28:"\n", 0x2c:" ", 0x2d:"-", 0x2e:"=", 0x2f:"[", 0x30:"]", 0x33:";", 0x34:"'", 0x36:",", 0x37:".", 0x38:"/", 0x2a:"[BACKSPACE]", 0x39:"[CAPSLOCK]"
}
shift_map = {
    0x04:"A", 0x05:"B", 0x06:"C", 0x07:"D", 0x08:"E", 0x09:"F", 0x0a:"G", 0x0b:"H", 0x0c:"I", 0x0d:"J", 0x0e:"K", 0x0f:"L", 0x10:"M", 0x11:"n", 0x12:"O", 0x13:"P", 0x14:"Q", 0x15:"R", 0x16:"S", 0x17:"T", 0x18:"U", 0x19:"V", 0x1a:"W", 0x1b:"X", 0x1c:"Y", 0x1d:"Z",
    0x1e:"!", 0x1f:"@", 0x20:"#", 0x21:"$", 0x22:"%", 0x23:"^", 0x24:"&", 0x25:"*", 0x26:"(", 0x27:")", 0x2d:"_", 0x2e:"+", 0x2f:"{", 0x30:"}", 0x33:":", 0x34: '\"', 0x36:"<", 0x37:">", 0x38:"?"
}

def solve():
    data_file = os.path.join(os.path.dirname(__file__), 'out.txt')
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

获取到

![image-20260412163334115](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260412172258473-404579366.png)

这是一个ADFGX，一战时期的加密系统

 加密原理（解密即逆过程）

解密 ADFGX 通常需要两个关键信息：**5x5 的字符矩阵**和**一个密钥（Keyword）**。

第一步：棋盘替换（Substitution）

加密时，会将字母表（通常去掉 J）填入 5x5 的矩阵中。（一般都会给棋盘，找百度的）

这个是棋盘

![5bca04a7b4](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260412172257307-1632504125.jpg)

ADFGX解码就是gogogo
和图片进行对撞，使用outguess

在 CTF 隐写术中，有一个非常著名的工具叫 **`outguess`**（英文原意就是“猜出”）。出题人在疯狂明示我们用这个工具！

`outguess` 可以在图片中隐藏文件，并且可以设置密码。显然，刚刚解出的 `gogogo` 就是密码。

**实战命令（在 Kali 或 Ubuntu 终端运行）：**

```bash
## 格式：outguess -k '密码' -r 要破解的图片 输出的文件名
outguess -k 'gogogo' -r mi.jpg flag.txt
```

> flag
> flag{Out9uEsS_1s_V4rY_e4sy}

---



#### [GFCTF 2021]双击开始冒险

题目链接:https://www.nssctf.cn/problem/874

这题是一题综合题目，不过也是简单一些，就是需要写鼠标脚本

![image-20260412211421436](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260412213213894-236515811.png)

根据附件信息，第一个层一个四位密码的爆破

用ziperehello爆破可以发现解压密码
![image-20260412211531984](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260412213213539-1622561454.png)

第二层的文件hiti出现了一个QQ号，直接输入看看，密码不对，那直接搜QQ吧![image-20260412211601378](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260412213213169-667674979.png)

发现签名有base64

>WW91IGxvdmUgbWUsIEkgbG92ZSB5b3U=

解析出是 
![image-20260412211855086](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260412213212781-1888133799.png)

第三层找到一个uuu.pcapng和flag.zip(加密)

那就是说需要从uuu.pcapng找出密码，根据前面的WP，用脚本直接解析

```bash
tshark -r uuu.pcapng -T fields -e usbhid.data > out.txt
```

不同的是，这次是一个鼠标流量题目，需要用脚本分析鼠标轨迹

```python
## -*- coding: gbk -*-
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

![image-20260412212315616](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260412213211991-802657343.png)

获取到flag.zip密码


吓我一雷，既然不是真的flag，那就用常规的思路分析
strings提取文件,它的核心作用是：**从任意文件（尤其是二进制文件）中提取出可打印的字符序列（字符串）**



获取到flag

> flag:
> GFCTF{this_is_rea1_fllllll11ag}

---

#### [MoeCTF 2021]诺亚的日记

题目链接:https://www.nssctf.cn/problem/3372

这题和前面的一样了，就脚本一把出，然后找出关键信息,代码结果如图

![image-20260412212912272](https://img2024.cnblogs.com/blog/3726946/202604/3726946-20260412213210175-979831959.png)

>flag
>moectf{D@m3daNe_D4me_yoooooo}

---

## 

```md wrap
misc流量分析基础教程
```
