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

## pwn-libc快速识别和下载绑定脚本-PWN_LIBC_TOOL

CTF PWN 本地环境一键配置工具 — 自动下载 libc/链接器、patchelf 绑定、libc.rip 在线查询

![image-20260615105732918](https://img2024.cnblogs.com/blog/3726946/202606/3726946-20260615111246885-928938075.png)

### 更新日志

### [2.1.0] - 2026-07-16

#### 新增 (Added)

- **Docker 提取链接器**（核心新功能）：一键从 Docker 容器提取 `ld-linux`，保证 ld 与发行版 100% 版本匹配，彻底避免 ld/libc 版本不一致问题。
  - 新增映射表 `DOCKER_IMAGE_MAP`：glibc 主版本 → Docker 镜像（Ubuntu `2.23→16.04`/`2.27→18.04`/`2.31→20.04`/`2.35→22.04`/`2.39→24.04`；Debian `2.28→buster`/`2.31→bullseye`/`2.36→bookworm`/`2.38→trixie`）。
  - 新增 6 个函数：`check_docker()`、`parse_glibc_major()`、`detect_glibc_distro()`、`get_docker_image()`、`extract_ld_from_docker()`、`docker_extract_menu()`。
  - 主菜单新增第 10 项 `Docker 提取链接器 (推荐，版本一定匹配)`。
- **glibc 2.39 (Ubuntu 24.04) 支持**：v2.0 因镜像无 2.39 deb 包下载失败，v2.1 可直接 Docker 拉取 `ubuntu:24.04` 提取 ld。

#### 变更 (Changed)

- patchelf 绑定找不到匹配链接器时的回退路径：先调用 `check_docker()`，Docker 可用则提供 `[1] Docker 提取（推荐，秒完成，版本一定匹配）` / `[2] 下载 deb 包提取（较慢，可能找不到包）`；Docker 不可用时强制走 deb 下载路径（与 v2.0 一致）。
- BANNER 版本号 `PWN_LIBC_TOOL v2.0` → `v2.1`。

> 备注：`MIRRORS` 镜像源、19 个工具函数、pwninit 集成、主菜单 1-9 项在本次升级中字符级一致，仅行号偏移。

---

### [2.0.0] - 2026-06-14

#### 新增 (Added)

- 首个版本发布。CTF libc 本地复现工具，一键下载 libc + 链接器 + patchelf 绑定：
  - 19 个镜像源（Debian 安全更新 / Debian 主仓库 / Ubuntu 安全更新 / Ubuntu 主仓库 / Kali / CentOS-RHEL，含清华/中科大/阿里云）。
  - libc.rip 在线查询（泄露地址/偏移自动解析 + 网页跳转）。
  - patchelf 绑定（兼容 WSL NTFS 文件系统的 /tmp 临时方案）。
  - pwninit (Rust 版) 自动安装 + 一键配置。
  - arpy fallback 解包 deb（Windows 环境兼容）。

---

### PWN_LIBC_TOOL 使用说明

CTF libc 本地复现工具 —— 一键下载 libc + 链接器 + patchelf 绑定。

#### 使用流程

> 💡 **v2.1 起首选 Docker**：只要本机装了 Docker，功能 10（或功能 2 的回退）可秒级提取与发行版 **100% 匹配**的 `ld-linux`，彻底避免 ld/libc 版本不一致导致的崩溃。

##### 场景 1：题目给了 libc.so.6

```bash
# 1. 放到题目目录
cp libc.so.6 /path/to/challenge/

# 2. 运行工具
cd /path/to/challenge/
python3 libc_tool.py

# 3. 选功能 9 (pwninit) 或功能 2 (手动 patchelf)
#    缺 ld 时会提示 Docker 提取（推荐）或 deb 下载
#    自动生成 <二进制名>_patched，直接跑 exploit
```

##### 场景 2：只有泄露地址，不知道 libc 版本

```bash
python3 libc_tool.py

# 1. 选功能 8，粘贴泄露地址
#    [*] puts:   0x7f1234567890
#    [*] printf: 0x7f1234560000
#
# 2. 工具自动查询 libc.rip，找到版本并下载
# 3. 选功能 9 或功能 2 绑定二进制
```

##### 场景 3：已知 libc 版本号

```bash
python3 libc_tool.py

# 1. 选功能 1，输入版本号
#    如: 2.35-0ubuntu3.13_amd64
#
# 2. 自动下载 libc + ld-linux
# 3. 选功能 2 绑定二进制
```

##### 场景 4：deb 源下不到 ld / 追求版本精确匹配（v2.1 新增）

```bash
python3 libc_tool.py

# 1. 选功能 10 (Docker 提取链接器)
# 2. 工具扫描目录 libc → 识别 glibc 主版本与发行版
#    → docker pull 对应镜像 → 提取匹配的 ld-linux
#    适合 glibc 2.39 (Ubuntu 24.04) 等镜像无 deb 包的情况
# 3. 选功能 2 绑定二进制
```

##### 功能菜单一览

| 功能   | 说明                                                    |
| ------ | ------------------------------------------------------- |
| 1      | 下载 libc + 链接器                                      |
| 2      | patchelf 绑定二进制                                     |
| 3      | 一键完成（下载 + 绑定）                                 |
| 4      | 检测当前目录 libc 版本                                  |
| 5      | 查看二进制使用的链接器（readelf）                       |
| 6      | 查看 libc 详细版本（strings）                           |
| 7      | 根据已有文件下载匹配的链接器 / libc                     |
| 8      | libc.rip 在线查询（泄露地址/偏移查版本）                |
| 9      | pwninit 一键配置（自动下载 ld + patchelf）              |
| **10** | **Docker 提取链接器（推荐，版本一定匹配）** ⭐ v2.1 新增 |
| 0      | 退出                                                    |

### 功能详解

#### 功能 1：下载 libc + 链接器

输入 libc 版本号（如 `2.35-0ubuntu3.13_amd64`），工具会：

1. 从近 20 个镜像源尝试下载 deb 包
2. 自动检测发行版（Debian / Ubuntu），只搜对应镜像
3. 精确版本找不到时，自动搜索同系列最新版
4. 提取 `libc.so.6` 和 `ld-linux-x86-64.so.2`

支持的镜像源：清华 / 阿里云 / 中科大镜像、Debian/Ubuntu 官方源、安全更新源、旧版归档源。

---



#### 功能 2：patchelf 绑定二进制

自动扫描目录中的文件：

- **libc 文件**：`.so` / `.so.6` 等，自动识别版本和发行版
- **ld 文件**：`ld-*.so` / `ld-linux-*.so.2`，自动识别版本
- **二进制文件**：排除 `.so` / `.py` / IDA 数据库等

选择 libc 后，自动匹配同版本的 ld 文件：

- 版本完全匹配 → 直接使用
- 版本不匹配 → 显示警告，让用户选择
- **没有 ld → 回退获取（v2.1 变更）**：
  - Docker 可用 → `[1] Docker 提取（推荐，秒完成，版本一定匹配）` / `[2] 下载 deb 包提取（较慢，可能找不到包）`
  - Docker 不可用 → 直接走 deb 下载

---



#### 功能 7：根据已有文件下载

- 有 libc → 下载匹配的 ld-linux
- 有 ld → 下载匹配的 libc
- 自动识别文件版本，从 deb 包中提取

---



#### 功能 8：libc.rip 在线查询

支持多种输入格式：

```asm
# pwntools 输出（直接复制）
[*] puts: 0x7fbb47a80e50
[*] printf: 0x7fbb47a606f0

# 其他格式
puts: 0x7f1234567890
puts 0x7f1234567890
0x7f1234567890
```

查询结果包含：libc 版本号、下载链接（libc.so）、符号偏移表。

---



#### 功能 9：pwninit 一键配置

调用 [pwninit](https://github.com/io12/pwninit) 自动完成：

1. 检测 libc 版本
2. 下载匹配的 ld-linux
3. patchelf 生成 `xxx_patched` 文件

如果 pwninit 未安装，工具会自动从 GitHub 下载 Rust 版本。

---



#### 功能 10：Docker 提取链接器（v2.1 新增，推荐）

从 Docker 容器直接提取 `ld-linux`，**保证 ld 与发行版 100% 匹配**，最可靠：

1. 扫描目录 libc，识别 glibc 主版本与发行版（Ubuntu / Debian）
2. 通过 `DOCKER_IMAGE_MAP` 映射到对应镜像
   （如 `2.31→ubuntu:20.04`、`2.35→ubuntu:22.04`、`2.39→ubuntu:24.04`、`2.36→debian:bookworm`）
3. `docker pull` + `docker run cat ld-linux` 提取，并校验 ELF magic
4. 提取后配合功能 2 绑定二进制

> 前提：本机已安装并启动 Docker（工具会先用 `check_docker()` 检测）。对镜像无 deb 包的新版本（如 glibc 2.39）尤其有用。

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

## 2.syscall地址查询-PWN_SYSCALL_TOOL 

仓库链接:

::alert{icon="tabler:files" color="var(--c-accent)" title="HACKED的脚本gitee仓库"}

[脚本下载，点击跳转](https://gitee.com/ASUS_HACKED/cybersecurity/tree/%E6%AF%94%E8%B5%9B%E9%99%84%E4%BB%B6/HACKED%E7%9A%84%E8%84%9A%E6%9C%AC%E5%B7%A5%E5%85%B7/%E5%88%B6%E4%BD%9C%E7%9A%84%E5%B7%A5%E5%85%B7/pwn)
::

### PWN_SYSCALL_TOOL 更新日志

#### [1.2.1] - 2026-07-12

##### 新增 (Added)

- **字节验证**：对 ROPgadget 找到的每个 gadget，读取二进制验证地址处实际机器码；假阳性 gadget（字节不匹配）会被标记 `[!]` 警告。
- **直接字节搜索**：对简单 gadget（`pop rdi/rsi/rax/rdx/rsp`、`syscall; ret` 等）直接扫描二进制字节序列，不依赖 ROPgadget，结果更准确。
- `pop rsp` 加入 64-bit gadget 列表（常见于栈迁移）。
- `pop rbp` 加入 64-bit gadget 列表。

##### 变更 (Changed)

- 字节搜索结果与 ROPgadget 结果合并去重，优先显示字节验证通过的地址。
- 模板输出中 `[未找到]` 的 gadget 不再输出。

##### 修复 (Fixed)

- 当 ROPgadget 搜索结果为空时，字节搜索仍然执行。

---

#### [1.1.0] - 2026-07-11

##### 新增 (Added)

- 新增 `find_syscall_ret_raw()`：直接搜索二进制中 `syscall; ret`（`\x0f\x05\xc3`）字节，当 ROPgadget 找不到 / 不可用时作为后备，保证 amd64 架构总能找到 syscall。
- 增加 `max_instr` 过滤参数：每个 gadget 条目增加最大指令数限制（默认 8），过滤超过 8 条指令的垃圾 gadget，同时保留常用的 CSU 链（约 6 条）。

##### 变更 (Changed)

- 修复 `pop rdx` 等 gadget 正则：从 `pop rdx\s*;\s*ret` 改为 `pop rdx\s*;.*?ret`，新正则匹配以 ret 结尾的任意 gadget，兼容 CSU 链等中间指令。
- 移除多余的 `\s*`，让 gadget 正则匹配更宽松。
- `key_gadgets` 数据结构从字符串列表改为 `(名称, max_instr)` 元组列表。

##### 移除 (Removed)

- 移除裸 `syscall` pattern（ROPgadget 输出格式不统一），替换为 `syscall.*?ret`。

##### 修复 (Fixed)

- 修复 `find_gadgets()` 在 ROPgadget 不可用时直接返回空字典的问题，改为 `gadget_lines = parse_gadgets(output) if output else []`，确保后备搜索正常执行。

---

#### [1.0.0] - 2026-06-15

#### 新增 (Added)

- 首个版本发布。交互式菜单选择二进制文件，自动完成：
  - 架构检测（i386 / amd64）
  - syscall gadget 搜索
  - 可写全局变量查找
  - `/bin/sh` 字符串搜索
  - exploit 模板输出

---



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

---

## 3.程序汇编分析ret2reg

### 特性

- **菜单驱动**：8 大功能，1-8 选数字，0 退出。无需记命令行参数。
- **全段反汇编**：用 `objdump -D`（大写 D）跨段反汇编，函数之间的"野字节"也不会漏 — 找 gadget 的关键。
- **任意地址窗口**：从任意 vaddr 起看 N 字节，自动跨段；同时输出反汇编 + hex dump + ASCII 三栏。
- **checksec**：NX / PIE / Canary / RELRO 一键查看，pwntools 优先，readelf / objdump 兜底。
- **ROP gadget 查找**：内置常用 ret2reg 正则（`push esp` / `jmp rax` 等），也支持自定义正则；选项 7 提供专业的 5 项子菜单（列所有 / 关键词 / 验证 / asm 模式 / 完整模式）。
- **shellcode 生成**：自动识别 arch（i386 / amd64），输出 `/bin/sh` shellcode，可直接写文件（需要 pwntools）。
- **优雅降级**：缺 pwntools 不崩、缺 ROPgadget 不崩、缺 capstone 也不崩（字节搜索不依赖 capstone）。
- **跨平台**：Windows（Git Bash / MSYS2）、Linux 原生支持。`shutil.which` 替代 `which`，原生 cmd 也能跑。
- **中文 UI 友好**：CJK 字符宽度按 2 计算，box 不会错位；颜色自动跟随 TTY，重定向到管道时无 ANSI 污染。
- **细节点**：Ctrl+L 自定义为 redraw-current-line（不清屏，菜单历史保留），方向键可调出历史命令。

---

### 目录结构

```
汇编工具/
├── ob.py          # 主程序（单文件，菜单驱动 binary 分析 CLI）
├── README.md      # 本文件
├── CHANGELOG.md   # 更新日志（Keep-a-Changelog 风格）
├── LICENSE        # MIT 许可证
├── requirements.txt  # Python 依赖
└── .gitignore     # Git 忽略规则
```

---

### 安装依赖

#### 必装（外部命令）

`ob.py` 的核心功能依赖系统的 binutils：

```bash
# Debian / Ubuntu
sudo apt install binutils

# Arch
sudo pacman -S binutils

# macOS (Homebrew)
brew install binutils

# Windows 推荐 Git Bash (MSYS2) 环境
# 已有 objdump / readelf 即可，路径加入 PATH
```

#### 选装（增强功能）

| 工具            | 作用                                             | 安装                      |
| --------------- | ------------------------------------------------ | ------------------------- |
| **pwntools**    | 启用 checksec 精确输出、hex dump、shellcode 生成 | `pip install pwntools`    |
| **ROPgadget**   | 启用 gadget 正则查找                             | `pip install ROPgadget`   |
| **capstone**    | 启用字节级 gadget 验证和 asm 模式搜索            | `pip install capstone`    |
| **gnureadline** | Windows 下方向键支持（Linux 自带 readline）      | `pip install gnureadline` |

### Python 依赖

```bash
pip install -r requirements.txt
```

> `requirements.txt` 只列了 pwntools。其他都是可选，缺哪个功能会优雅降级。

---

### 快速开始

```bash
# 1. 启动（会提示输入 binary 路径）
python ob.py

# 2. 或者直接指定 binary
python ob.py ./ret2reg32

# 3. 按菜单选功能，例如选 4 看 vaddr 起的字节
[+] 选择功能 (0-8): 4
[+] 输入 vaddr (如 0x080490eb / 0x4011b6): 0x4011b6
[+] 字节数 (默认 128): 256
```

启动后主菜单：

```
  =======================================================
  当前 binary: ./ret2reg32
  =======================================================
  主菜单:
  1 - 全部反汇编
  2 - 指定段反汇编 (如 .text / .plt)
  3 - 看指定函数
  4 - 看 vaddr 起的字节 (默认 128B, 跨段)
  5 - 自定义起止范围 (start - end)
  6 - ELF 段 / 符号信息
  7 - 找 ret2reg gadget (内置子菜单)
  8 - 生成 shellcode (需 pwntools)
  0 - 退出
  =======================================================
[+] 选择功能 (0-8):
```

---

### 功能选项

| 选项 | 功能                                              | 需要                                   |
| :--: | ------------------------------------------------- | -------------------------------------- |
|  1   | 全部反汇编（跨段，包括函数间杂字节）              | `objdump`                              |
|  2   | 指定段反汇编（先列 PROGBITS 段名）                | `objdump` + `readelf`                  |
|  3   | 看指定函数                                        | `objdump`                              |
|  4   | 从 vaddr 起看 N 字节（反汇编 + hex dump + ASCII） | `objdump`，pwntools 可选               |
|  5   | 自定义起止范围反汇编（start – end）               | `objdump`，pwntools 可选               |
|  6   | ELF 段 / 符号信息（header / sections / symbols）  | `readelf`                              |
|  7   | 找 ret2reg gadget（内置子菜单）                   | `ROPgadget`（可选） + capstone（可选） |
|  8   | 生成 shellcode（自动识别 arch）                   | `pwntools`                             |
|  0   | 退出                                              | —                                      |

---

###  已知限制

- `show_func` 用空行作为函数结束标记 — 如果 objdump 输出中函数体内有内嵌空行（罕见），会过早截断。
- `show_section` 的段名解析依赖 `readelf -S` 的输出格式 — 不同 binutils 版本微调后可能需要小幅适配。
- 选项 5 的范围上限默认 64K，超过会要二次确认（按 `y` 继续）— 避免终端被刷屏。
- `which` → `shutil.which` 已修复，原生 Windows cmd 也能跑。
- 中文字符宽度按 GB2312 + 全角范围估算；极冷门的 CJK 扩展区字符可能宽度计算不准。





```md wrap
<!-- 你可以在此处书写大纲，并在上方完成文章 -->
```
