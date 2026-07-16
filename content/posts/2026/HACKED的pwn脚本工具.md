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



---

## [v2.1]

✨ 新增 (Added)

Docker 容器提取链接器（核心新功能）

新增一键从 Docker 容器提取 `ld-linux` 链接器的能力，**保证 ld 与发行版 100% 版本匹配**，彻底避免 ld/libc 版本不一致问题。

**新增常量**

- `DOCKER_IMAGE_MAP` (`libc_tool_1.py:118-130`)
  - glibc 主版本 → Docker 镜像映射表
  - Ubuntu：`2.23 → 16.04`、`2.27 → 18.04`、`2.31 → 20.04`、`2.35 → 22.04`、`2.39 → 24.04`
  - Debian：`2.28 → buster`、`2.31- → bullseye`、`2.36 → bookworm`、`2.38 → trixie`

**新增函数**

| 函数                       | 位置                  | 功能                                                         |
| -------------------------- | --------------------- | ------------------------------------------------------------ |
| `check_docker()`           | `libc_tool_1.py:1217` | 检查 Docker 是否安装 + daemon 是否启动                       |
| `parse_glibc_major()`      | `libc_tool_1.py:1228` | 从 `2.31-0ubuntu9.16_amd64` 提取主版本 `2.31`                |
| `detect_glibc_distro()`    | `libc_tool_1.py:1234` | 自动识别 ubuntu / debian                                     |
| `get_docker_image()`       | `libc_tool_1.py:1253` | 综合主版本+发行版返回镜像名（特殊处理 Debian 2.31 → bullseye） |
| `extract_ld_from_docker()` | `libc_tool_1.py:1263` | `docker pull` + `docker run cat ld-linux` + 校验 ELF magic   |
| `docker_extract_menu()`    | `libc_tool_1.py:1326` | 完整交互菜单（扫描 libc → 检查 docker → 提取 → 验证提示）    |

**新增菜单项**

- 主菜单新增 **第 10 项**：`Docker 提取链接器 (推荐，版本一定匹配)`
- 调度分支：`elif choice == '10': docker_extract_menu()` (`libc_tool_1.py:1510`)

新版本支持

- **glibc 2.39 (Ubuntu 24.04)**：v2.0 因镜像无 2.39 deb 包下载失败，v2.1 可直接 Docker 拉取 `ubuntu:24.04` 提取 ld

---

🔧 修改 (Changed)

功能 2（patchelf 绑定）— 找不到匹配链接器时的回退路径

**v2.0 行为**：直接询问"自动下载 deb 提取链接器?"，无 Docker 选项。

**v2.1 行为** (`libc_tool_1.py:1695-1736`)：先调用 `check_docker()`：

```
若 Docker 可用
  ├─ [1] Docker 提取 (推荐，秒完成，版本一定匹配)
  └─ [2] 下载 deb 包提取 (较慢，可能找不到包)

若 Docker 不可用 → 强制走 deb 下载路径（与 v2.0 一致）
```

**影响**：

- 有 Docker 用户：多 2 次 docker 检查调用，但可秒级获取精确匹配的 ld
- 无 Docker 用户：多花 ~2 秒（`docker --version` + `docker info`），最终走 deb 下载，功能等价

BANNER 版本号

- `libc_tool.py:121` `PWN_LIBC_TOOL v2.0` → `libc_tool_1.py:139` `PWN_LIBC_TOOL v2.1`



| 维度       | v2.0           | v2.1             | 变化                                 |
| ---------- | -------------- | ---------------- | ------------------------------------ |
| 文件       | `libc_tool.py` | `libc_tool_1.py` | -                                    |
| 行数       | 1520           | 1800             | **+280** (+18.4%)                    |
| 字节数     | 61,526         | 72,399           | +10,873 (+17.7%)                     |
| 新增函数   | -              | 6                | +6 (Docker 相关)                     |
| 新增菜单项 | 9 项           | 10 项            | +1 (Docker 提取)                     |
| diff hunks | -              | -                | 6 (4 纯插入 + 1 版本号 + 1 逻辑替换) |

---

✅ 未变更 (Unchanged)

以下模块在 v2.0 → v2.1 中**字符级一致**（仅行号偏移），确保向后兼容：

- `MIRRORS` 镜像源列表（19 个：Debian/Ubuntu/Kali/CentOS 官方 + 清华/中科大/阿里云）
- 19 个工具函数（`log` / `run_cmd` / `find_elf_files` / `identify_elf_type` / `scan_glibc_files` / `detect_libc_version` / `identify_version_from_file` / `_display_width` / `_box_line` / `query_libc_rip` / `fetch_matching_component` / `detect_interpreter` / `detect_libc_strings` / `download_file` / `download_deb` / `extract_deb` / `find_patchelf` / `do_patchelf` / `show_usage`）
- pwninit 集成（`find_pwninit` / `_is_rust_pwninit` / `install_pwninit` / `run_pwninit`，含原有的 deb 兜底逻辑）
- 主菜单 1-9 项及其分支处理
- `download_deb` 末尾的失败提示（含 Docker hint）

---

## [v2.0]

初始版本

CTF libc 本地复现工具基础版：

- 19 个镜像源（Debian 安全更新 / Debian 主仓库 / Ubuntu 安全更新 / Ubuntu 主仓库 / Kali / CentOS-RHEL）
- libc.rip 在线查询（支持泄露地址/偏移自动解析 + 网页跳转）
- patchelf 绑定（兼容 WSL NTFS 文件系统的 /tmp 临时方案）
- pwninit (Rust 版) 自动安装 + 一键配置
- arpy fallback 解包 deb（Windows 环境兼容）

---

## 版本对比速查

| 能力                              | v2.0            | v2.1                     |
| --------------------------------- | --------------- | ------------------------ |
| 多镜像下载 libc                   | ✅               | ✅                        |
| patchelf 绑定                     | ✅               | ✅                        |
| pwninit 一键配置                  | ✅               | ✅                        |
| libc.rip 在线查询                 | ✅               | ✅                        |
| **Docker 提取 ld**                | ❌               | ✅                        |
| **glibc 2.39 支持**               | ❌（镜像无 deb） | ✅（docker:ubuntu:24.04） |
| **patchelf 回退自动 Docker 优先** | ❌               | ✅                        |
| 菜单项数                          | 9               | 10                       |

## 使用流程

### 场景 1：题目给了 libc.so.6

```bash
# 1. 放到题目目录
cp libc.so.6 /path/to/challenge/

# 2. 运行工具
cd /path/to/challenge/
python3 libc_tool.py

# 3. 选功能 9 (pwninit) 或 功能 2 (手动 patchelf)
# 自动生成 format_station_patched，直接跑 exploit
```

### 场景 2：只有泄露地址，不知道 libc 版本

```bash
python3 libc_tool.py

# 1. 选功能 8，粘贴泄露地址
#    [*] puts: 0x7f1234567890
#    [*] printf: 0x7f1234560000
#
# 2. 工具自动查询 libc.rip，找到版本并下载
# 3. 选功能 9 或 2 绑定二进制
```

### 场景 3：已知 libc 版本号

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

## 2.syscall地址查询-PWN_SYSCALL_TOOL 

仓库链接:

::alert{icon="tabler:files" color="var(--c-accent)" title="HACKED的脚本gitee仓库"}

[脚本下载，点击跳转](https://gitee.com/ASUS_HACKED/cybersecurity/tree/%E6%AF%94%E8%B5%9B%E9%99%84%E4%BB%B6/HACKED%E7%9A%84%E8%84%9A%E6%9C%AC%E5%B7%A5%E5%85%B7/%E5%88%B6%E4%BD%9C%E7%9A%84%E5%B7%A5%E5%85%B7/pwn)
::

### PWN_SYSCALL_TOOL 更新日志

### v1.1

1. 数据结构重构 

| 项目                | v1.0                              | v1.1                                         |
| ------------------- | --------------------------------- | -------------------------------------------- |
| `GADGETS_*`         | `(name, pattern)` 二元组          | `(name, pattern, max_instr)` 三元组          |
| `key_gadgets`       | `['pop rax', ...]` 字符串列表     | `[('pop rax', 8), ...]` 元组列表             |
| `find_gadgets` 返回 | `dict[name] = (addr, asm)` 单结果 | `dict[name] = [(addr, asm), ...]` 多结果列表 |

2. syscall 后备搜索（核心新增功能）

- **新增 `find_syscall_ret_raw()` 函数**：直接搜索二进制 `\x0f\x05\xc3`（syscall; ret）字节序列
- **自动 fallback**：当 ROPgadget 找不到 / 崩溃 / 不可用时触发，保证 amd64 架构总能找到 syscall
- **pattern 修正**：`syscall` → `syscall\s*;\s*ret`，要求以 ret 结尾

3. 异常处理加固

所有 elftools 相关函数均加 `try/except` 防止崩溃：

- `vaddr_from_offset()`
- `find_writable_sections()`
- `find_binsh()`
- `run_ropgadget()`

4. `analyze()` 重构为双层结构

```python
# v1.0: 单层
def analyze(binary):
    ...

# v1.1: 双层，analyze() 捕获所有异常
def analyze(binary):
    try:
        _analyze_inner(binary)
    except Exception as e:
        print(f"[!] 分析出错: {e}")
```

5. 菜单交互优化

| 项目     | v1.0                       | v1.1                                                         |
| -------- | -------------------------- | ------------------------------------------------------------ |
| 展示时机 | 分段展示，每段单独按 Enter | **先完整展示所有结果**（gadget摘要 + 可写段 + /bin/sh + 模板），**最后统一交互** |
| 搜索提示 | 各段之间分散               | 仅末尾一次                                                   |
| 搜索方式 | 仅 gadget 名关键词         | 支持 `all` / 关键词 / 空（全部）                             |

6. gadget 显示增强

- **新增表头**：`指令(39) 数量(5) 地址(20)`
- **显示全部数量**：每个 gadget 类型标注匹配总数，超过 5 个时提示可单独查看
- **三种搜索模式**：
  - `all` / 空 → 显示所有类型的全部结果
  - 关键词 → 仅显示匹配类型的全部结果

7. 其他改进

- `run_ropgadget()` 增加 `stderr` 诊断输出和分异常类型处理
- `run_ropgadget()` 失败时打印 `（可能是中文路径或崩溃）` 提示
- banner 版本号更新为 `v1.1`
- `openat` syscall 号（257）加入 `SYSCALL_NUMS`



---

### V1.0

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





```md wrap
<!-- 你可以在此处书写大纲，并在上方完成文章 -->
```
