---
title: AI动画模型（用于进行编程语言的底层动画理解）
description: 编程语言可视化
date: 2026-05-18 11:48:41
updated: 2026-05-18 11:48:41
image: https://images.cnblogs.com/cnblogs_com/blogs/860797/galleries/2492655/o_260518052357_7a16dff1f69a6229d09de922a2697fe22afb1f75_raw.jpg
categories: [技术]
tags: [ai, 动画]
---

# AI动画模型（用于进行编程语言的底层动画）

## AI 模型

v1.0.0

效果的话看一下C++教程 第二章这里有一个测试
或者复制一下这个下载链接
[源代码/网页代码动画 · 工程部Teddy Bear/c++学习 - 码云 - 开源中国](https://gitee.com/ASUS_HACKED/cpp-learning/tree/master/源代码/网页代码动画)

这也证实了AI的强大的可怕之处，前端基本上AI能做的太多了

![image-20260323201058941](https://img2024.cnblogs.com/blog/3726946/202603/3726946-20260323201602382-620951411.png)


使用方法就是最好找一个模板，然后给AI训练模仿，达到效果之后就让它吐出指令标准

基于GEMINI PRO

## 动画代码

```markdown
终端测试
# 角色与核心任务
你是一个顶级 Web 前端架构师和动效导演。我需要你将一份全新的 Markdown 教程转换为单文件交互式 `.html`。
为了让你完全理解我所要求的【极客暗黑审美】、【绝对坐标系推演】和【多步状态机动画逻辑】，我将先向你展示一份“满分参考示例”。

# 第一部分：🌟 满分参考示例 (Golden Example)
请深度剖析并学习以下代码，这是你接下来的代码质量标杆。请特别注意它如何做到：
1. 【无损正文】：100% 完整保留了 Markdown 原文的所有细节、比喻和层级，没有任何删减总结。
2. 【预制 UI 复用】：灵活调用了 `.theme-blue`, `.theme-green`, `.theme-red`, `.pulse-glow` 等赛博朋克 CSS 原子类。
3. 【绝对坐标系】：底层的 `<svg><line>` 坐标与绝对定位的 `.net-node` (使用 left/top) 中心点完美对齐。
4. 【动画深度】：在 `playAnimStep` 函数中，通过直接修改 `style.left` 和 `style.top`，实现了多数据包的并发移动、状态突变（如节点变红报错）和深度逻辑推演。

[========== 请学习以下参考代码 ==========]（来自计算机网络）
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>1.4 计算机网络的定义和分类 | 终极无损流式版</title>
    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/atom-one-dark.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js"></script>

    <style>
        /* ================= 极客暗黑自然文档流 ================= */
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background-color: #0d1117; color: #c9d1d9; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.7; overflow-x: hidden; }
        
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #0d1117; }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #484f58; }

        .header { position: sticky; top: 0; height: 60px; background: rgba(22, 27, 34, 0.95); backdrop-filter: blur(10px); border-bottom: 1px solid #30363d; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; z-index: 100; }
        .logo-box { display: flex; align-items: center; gap: 12px; }
        .logo-icon { width: 32px; height: 32px; border-radius: 6px; background: #3b82f6; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; }
        .header-title { font-size: 18px; font-weight: bold; color: #38bdf8; }
        
        .main-body { max-width: 900px; margin: 0 auto; padding: 40px 20px 100px 20px; display: block; }
        
        /* 正文美化 */
        .article-body h1 { color: #58a6ff; font-size: 2.2em; padding-bottom: 10px; border-bottom: 2px solid #30363d; margin: 0 0 24px; }
        .article-body h2 { color: #3fb950; font-size: 1.6em; margin: 50px 0 20px; border-left: 4px solid #3fb950; padding-left: 12px; }
        .article-body h3 { color: #d2a8ff; font-size: 1.3em; margin: 30px 0 15px; }
        .article-body h4 { color: #a5d6ff; font-size: 1.1em; margin: 20px 0 10px; }
        .article-body h5 { color: #8b949e; font-size: 1em; margin: 15px 0 5px; }
        .article-body p { margin-bottom: 16px; font-size: 15.5px; }
        .article-body ul, .article-body ol { padding-left: 24px; margin-bottom: 16px; font-size: 15.5px; }
        .article-body li { margin-bottom: 8px; }
        .article-body blockquote { border-left: 4px solid #e3b341; padding: 10px 15px; background: rgba(227, 179, 65, 0.1); margin-bottom: 16px; color: #e3b341; line-height: 1.8; border-radius: 0 8px 8px 0; }
        
        /* 交互触发器 */
        .demo-trigger-btn { display: flex; align-items: center; justify-content: center; gap: 8px; background: #238636; color: #fff; padding: 14px 24px; border: 1px solid rgba(240,246,252,0.1); border-radius: 8px; font-size: 15px; font-weight: bold; cursor: pointer; margin: 25px 0; width: 100%; transition: all 0.2s ease; box-shadow: 0 4px 10px rgba(35, 134, 54, 0.2); outline: none; }
        .demo-trigger-btn:hover { background: #2ea043; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(35, 134, 54, 0.4); }
        .demo-trigger-btn.active-btn { background: #1f6feb; box-shadow: 0 0 15px rgba(31, 111, 235, 0.5); border-color: #58a6ff; }

        /* ================= 动态内联沙盒面板 ================= */
        .anim-panel { width: 100%; background: #0d1117; border: 2px solid #30363d; border-radius: 12px; overflow: hidden; display: none; flex-direction: column; margin: 10px 0 40px 0; box-shadow: 0 15px 35px rgba(0,0,0,0.5); animation: slideDown 0.4s ease forwards; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-15px); } to { opacity: 1; transform: translateY(0); } }
        
        .anim-header { height: 50px; background: #161b22; border-bottom: 1px solid #30363d; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; color: #34d399; font-weight: bold; font-size: 14px; }
        .close-btn { background: #ef4444; color: white; border: none; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; transition: 0.2s;}
        .close-btn:hover { background: #dc2626; }
        
        /* 画布与缩放黑科技 */
        .canvas-wrapper { width: 100%; height: 350px; background: #000; position: relative; transition: height 0.3s; display: flex; justify-content: center; align-items: flex-start; overflow: hidden; }
        .anim-canvas { width: 540px; height: 350px; position: relative; flex-shrink: 0; transform-origin: top center; }
        
        .console-area { height: 280px; background: #161b22; border-top: 1px solid #30363d; display: flex; flex-direction: column; }
        .btn-group { display: flex; gap: 8px; padding: 12px 16px; border-bottom: 1px solid #30363d; justify-content: space-between; align-items: center; }
        .action-btn { padding: 8px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold; color: white; transition: 0.2s; }
        .btn-next { background: #059669; }
        .btn-reset { background: #374151; }
        .console-output { flex: 1; overflow-y: auto; padding: 12px 16px; font-family: monospace; font-size: 13.5px; line-height: 1.6; color: #34d399; }
        
        /* 动画底层原子组件 */
        .net-node { position: absolute; background: #161b22; border: 2px solid #30363d; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #c9d1d9; font-size: 12px; font-weight: bold; transition: all 0.4s ease; box-shadow: 0 0 10px rgba(0,0,0,0.5); z-index: 5; text-align: center; }
        .net-node span { font-size: 10px; color: #8b949e; font-weight: normal; margin-top: -2px;}
        .net-box { position: absolute; border: 2px dashed #30363d; border-radius: 8px; background: rgba(22,27,34,0.3); transition: all 0.6s ease; display: flex; flex-direction: column; justify-content: flex-start; padding: 10px; z-index: 1;}
        .net-packet { position: absolute; background: #38bdf8; border-radius: 4px; box-shadow: 0 0 8px #38bdf8; opacity: 0; z-index: 10; transition: opacity 0.3s ease, left 0.8s cubic-bezier(0.4, 0, 0.2, 1), top 0.8s cubic-bezier(0.4, 0, 0.2, 1); display: flex; justify-content: center; align-items: center; font-size: 10px; font-weight: bold; color: #0d1117;}
    </style>
</head>
<body>
    <header class="header">
        <div class="logo-box">
            <div class="logo-icon">Net</div>
            <div class="header-title">1.4 计算机网络的定义和分类</div>
        </div>
        <div style="font-size:12px; color:#8b949e;" id="pc-tag">手工精修无损版</div>
    </header>

    <div class="main-body">
        <div class="article-body" id="content-container">
            <h2>1.4 计算机网络的定义和分类</h2>

            <h3>1.4.1 定义</h3>
            <blockquote>
                计算机网络是一个将地理位置不同、具有独立功能的<strong>多个计算机系统</strong>，通过<strong>通信设备和线路</strong>连接起来，在功能完善的<strong>网络软件</strong>（协议、OS等）管理下，以<strong>资源共享</strong>和<strong>信息传递</strong>为目的的系统。
            </blockquote>

            <hr style="border:0; border-top:1px solid #30363d; margin:20px 0;">

            <p><strong>大众版本（给小白朋友）：</strong></p>
            <ul>
                <li><strong>比喻：</strong> 就像一个“全球对讲机+共享仓库”系统。</li>
                <li><strong>大白话：</strong> 把散落在各地的电脑用网线或 Wi-Fi 连起来，让它们能互相说话（发微信）、互相传东西（看电影、下资料）。最重要的是，每台电脑都是独立的，谁也不是谁的附属品。</li>
            </ul>

            <button class='demo-trigger-btn' onclick='loadScenario("def_demo", this)'>▶ 启动沙盒：独立计算机系统与资源互传推演</button>

            <hr style="border:0; border-top:1px solid #30363d; margin:30px 0;">

            <h3>1.4.2 网络分类</h3>
            <p>分类方式很多，最常用的是按<strong>地理覆盖范围</strong>来分。</p>

            <h4>地理覆盖范围</h4>

            <h5>1. 广域网 (WAN, Wide Area Network)</h5>
            <ul>
                <li><strong>专家视角：</strong> 跨越非常大的物理范围（几十到几千公里），通常连接不同城市或国家。因特网的核心部分就是由许多广域网连接而成的。</li>
                <li><strong>大众视角：</strong> “大网”。跨城市、跨国的网络，比如连通北京和纽约的网络。</li>
            </ul>

            <h5>2. 城域网 (MAN, Metropolitan Area Network)</h5>
            <ul>
                <li><strong>专家视角：</strong> 覆盖范围通常为一个城市（5到50公里），常作为城市内不同局域网的互连骨干。</li>
                <li><strong>大众视角：</strong> “中网”。覆盖一个城市的网络，比如某个城市的“教育网”或“政务网”。</li>
            </ul>

            <h5>3. 局域网 (LAN, Local Area Network)</h5>
            <ul>
                <li><strong>专家视角：</strong> 覆盖范围小（几百米到几公里），数据传输速率高，误码率低。通常由一个单位、学校或家庭自行建设。</li>
                <li><strong>大众视角：</strong> “小网”。你家里的 Wi-Fi、办公室的电脑网、学校机房的网。</li>
            </ul>

            <h5>4. 个域网 (PAN, Personal Area Network)</h5>
            <ul>
                <li><strong>专家视角：</strong> 指个人工作地方把属于个人使用的电子设备（如手机、耳机、电脑）用无线技术连接起来的网络。</li>
                <li><strong>大众视角：</strong> “随身网”。你手机连着蓝牙耳机和智能手表，它们几个之间传数据，就构成了个域网。</li>
            </ul>

            <button class='demo-trigger-btn' onclick='loadScenario("geo_scope_demo", this)'>▶ 启动沙盒：从 PAN 扩散至 WAN 的宏观推演</button>

            <hr style="border:0; border-top:1px solid #30363d; margin:30px 0;">

            <h4>按使用者分</h4>
            <ul>
                <li><strong>公用网 (Public Network)：</strong> 只要交钱就能上的，如电信、联通的移动网络。</li>
                <li><strong>专用网 (Private Network)：</strong> 特殊部门用的，如军队、银行内部网络（你在分析流量时可能会遇到这类私有 IP 协议）。</li>
            </ul>

            <hr style="border:0; border-top:1px solid #30363d; margin:30px 0;">

            <h4>按交换方式分：</h4>
            <ul>
                <li><strong>电路交换网</strong></li>
                <li><strong>报文交换网</strong></li>
                <li><strong>分组交换网</strong>（这就是我们现在用的因特网）</li>
            </ul>

            <button class='demo-trigger-btn' onclick='loadScenario("switching_demo", this)'>▶ 启动沙盒：电路独占 vs 多分组并发寻路推演</button>

            <hr style="border:0; border-top:1px solid #30363d; margin:30px 0;">

            <h4>按拓扑结构分</h4>
            <ul>
                <li><strong>星型：</strong> 大家都连着中间一个路由器（像海星）。</li>
                <li><strong>总线型：</strong> 大家都挂在一根长绳子上。</li>
                <li><strong>网状型：</strong> 乱七八糟互相连，最稳固，因特网核心部分就是这种。</li>
            </ul>

            <button class='demo-trigger-btn' onclick='loadScenario("topology_demo", this)'>▶ 启动沙盒：灾难断网与三大拓扑稳健性测试</button>

        </div>
    </div>

    <aside class="anim-panel" id="anim-panel">
        <div class="anim-header">
            <span id="anim-title">🎯 互动推演沙盒</span>
            <button class="close-btn" onclick="closeSandbox()">✖ 收起沙盒</button>
        </div>
        
        <div class="canvas-wrapper" id="canvas-wrapper">
            <div class="anim-canvas" id="anim-canvas"></div>
        </div>

        <div class="console-area">
            <div class="btn-group">
                <span style="color:#8b949e; font-size:12px;">// 网络层控制台日志</span>
                <div style="display:flex; gap:10px;">
                    <button class="action-btn btn-reset" onclick="resetAnim()">↻ 重置链路</button>
                    <button class="action-btn btn-next" id="next-btn" onclick="playAnimStep()" disabled>▶ 执行下一步</button>
                </div>
            </div>
            <div class="console-output" id="console-output"></div>
        </div>
    </aside>

    <script>
        if(window.innerWidth <= 600) { document.getElementById('pc-tag').style.display = 'none'; }

        /* =========================================================
           兜底离线高亮系统（并净化 \xA0）
           ========================================================= */
        function applyOfflineHighlight() {
            document.querySelectorAll('pre code').forEach(block => {
                if(block.dataset.highlighted) return;
                let html = block.innerHTML;
                html = html.replace(/\u00A0/g, " "); 
                block.innerHTML = html;
                block.dataset.highlighted = 'yes';
            });
        }

        window.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                if (typeof hljs !== 'undefined') {
                    try { hljs.highlightAll(); } catch(e) { applyOfflineHighlight(); }
                } else { applyOfflineHighlight(); }
            }, 100);
            applyScaling(); 
        });

        /* =========================================================
           等比缩放黑科技 (Scale-to-Fit)
           ========================================================= */
        function applyScaling() {
            const wrapper = document.getElementById('canvas-wrapper');
            const canvas = document.getElementById('anim-canvas');
            const panel = document.getElementById('anim-panel');
            if (panel.style.display === 'none') return;
            
            const panelWidth = panel.clientWidth;
            if (panelWidth < 540 && panelWidth > 0) {
                const scaleFactor = panelWidth / 540;
                canvas.style.transform = `scale(${scaleFactor})`;
                wrapper.style.height = `${350 * scaleFactor}px`; 
            } else {
                canvas.style.transform = 'none';
                wrapper.style.height = '350px';
            }
        }
        window.addEventListener('resize', applyScaling);

        /* =========================================================
           动态内联沙盒控制逻辑 (DOM 穿梭)
           ========================================================= */
        let currentScenario = '';
        let currentStep = 0;
        const consoleEl = document.getElementById('console-output');
        const animTitle = document.getElementById('anim-title');
        const animCanvas = document.getElementById('anim-canvas');
        const nextBtn = document.getElementById('next-btn');
        const animPanel = document.getElementById('anim-panel');

        function closeSandbox() {
            animPanel.style.display = 'none';
            document.querySelectorAll('.demo-trigger-btn').forEach(b => {
                b.classList.remove('active-btn');
                b.innerText = b.innerText.replace('收起', '启动');
            });
            currentScenario = '';
        }

        function logMsg(code, desc, isWarn=false) {
            const color = isWarn ? '#ef4444' : '#60a5fa';
            consoleEl.innerHTML += `<div style="margin-bottom:10px; line-height:1.5; background:rgba(0,0,0,0.2); padding:8px; border-radius:4px; border-left:3px solid ${color};">` +
                                   `<span style="color:${color}; font-weight:bold; font-family:monospace;">[${code}]</span><br>` +
                                   `<span style="color:#c9d1d9; padding-left:10px;">${desc}</span></div>`;
            consoleEl.scrollTop = consoleEl.scrollHeight;
        }

        // ================= 核心推演数据库 (精心计算过的绝对坐标系) =================
        const scenarioData = {
            'def_demo': {
                title: '🎯 核心：独立系统的通信与共享',
                html: `
                    <svg xmlns="http://www.w3.org/2000/svg" style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:0;">
                        <line id="def-l1" x1="100" y1="175" x2="270" y2="175" stroke="#30363d" stroke-width="2" stroke-dasharray="10" />
                        <line id="def-l2" x1="270" y1="175" x2="440" y2="175" stroke="#30363d" stroke-width="2" stroke-dasharray="10" />
                    </svg>
                    <div id="def-n1" class="net-node" style="top:145px; left:70px; width:60px; height:60px;">主机 A<span>(独立运作)</span></div>
                    <div id="def-sw" class="net-node" style="top:150px; left:245px; width:50px; height:50px; border-color:#8b949e;">交换机</div>
                    <div id="def-n2" class="net-node" style="top:145px; left:410px; width:60px; height:60px; border-color:#facc15;">服务器<span>(资源共享)</span></div>
                    
                    <div id="def-pkt" class="net-packet" style="width:20px; height:20px; top:165px; left:90px; border-radius:50%; background:#10b981; box-shadow:0 0 10px #10b981;"></div>
                `,
                initLog: '两台地理位置分散、各自独立的计算机系统已启动。'
            },
            'geo_scope_demo': {
                title: '🎯 覆盖：从 PAN 演进到 WAN',
                html: `
                    <div id="box-wan" class="net-box" style="top:30px; left:20px; width:500px; height:300px; opacity:0; border-color:#eab308;"><span style="color:#eab308; font-weight:bold; font-size:12px;">广域网 (WAN)</span></div>
                    <div id="box-man" class="net-box" style="top:70px; left:60px; width:420px; height:240px; opacity:0; border-color:#a855f7;"><span style="color:#a855f7; font-weight:bold; font-size:12px;">城域网 (MAN)</span></div>
                    <div id="box-lan" class="net-box" style="top:120px; left:120px; width:300px; height:160px; opacity:0; border-color:#38bdf8;"><span style="color:#38bdf8; font-weight:bold; font-size:12px;">局域网 (LAN)</span></div>
                    <div id="box-pan" class="net-box" style="top:150px; left:200px; width:140px; height:100px; opacity:0; border-color:#10b981; align-items:center; justify-content:center; flex-direction:row; gap:10px;">
                        <span style="position:absolute; top:2px; left:5px; color:#10b981; font-weight:bold; font-size:11px;">个域网(PAN)</span>
                        <div class="net-node" style="position:relative; width:30px; height:30px; border-color:#10b981;">📱</div>
                        <div class="net-node" style="position:relative; width:30px; height:30px; border-color:#10b981;">⌚</div>
                    </div>
                `,
                initLog: '地理宏观推演已就绪，注意边界的扩大。'
            },
            'switching_demo': {
                title: '🎯 并发对比：电路独占 vs 分组路由',
                html: `
                    <svg xmlns="http://www.w3.org/2000/svg" style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:0;">
                        <line x1="70" y1="175" x2="180" y2="90" stroke="#30363d" stroke-width="2"/>
                        <line x1="180" y1="90" x2="360" y2="90" stroke="#30363d" stroke-width="2"/>
                        <line x1="360" y1="90" x2="470" y2="175" stroke="#30363d" stroke-width="2"/>
                        
                        <line x1="70" y1="175" x2="180" y2="260" stroke="#30363d" stroke-width="2"/>
                        <line x1="180" y1="260" x2="360" y2="260" stroke="#30363d" stroke-width="2"/>
                        <line x1="360" y1="260" x2="470" y2="175" stroke="#30363d" stroke-width="2"/>
                        
                        <line x1="180" y1="90" x2="360" y2="260" stroke="#30363d" stroke-width="2" stroke-dasharray="4,4"/>
                        
                        <path id="circuit-line" d="M 70 175 L 180 90 L 360 90 L 470 175" stroke="#facc15" stroke-width="5" fill="none" style="opacity:0; transition:0.5s;"/>
                    </svg>
                    <div class="net-node" style="top:150px; left:45px; width:50px; height:50px;">发送端</div>
                    <div class="net-node" style="top:150px; left:445px; width:50px; height:50px;">接收端</div>
                    <div class="net-node" style="top:70px; left:160px; width:40px; height:40px; border-color:#8b949e;">R1</div>
                    <div class="net-node" style="top:70px; left:340px; width:40px; height:40px; border-color:#8b949e;">R2</div>
                    <div class="net-node" style="top:240px; left:160px; width:40px; height:40px; border-color:#8b949e;">R3</div>
                    <div class="net-node" style="top:240px; left:340px; width:40px; height:40px; border-color:#8b949e;">R4</div>
                    
                    <div id="pkt-c" class="net-packet" style="width:36px; height:18px; top:166px; left:52px; background:#facc15; box-shadow:0 0 10px #facc15; font-size:10px; line-height:18px; color:#000;">Data</div>
                    
                    <div id="pkt-p1" class="net-packet" style="width:16px; height:16px; top:167px; left:52px;">1</div>
                    <div id="pkt-p2" class="net-packet" style="width:16px; height:16px; top:167px; left:52px; background:#10b981;">2</div>
                    <div id="pkt-p3" class="net-packet" style="width:16px; height:16px; top:167px; left:52px; background:#a855f7;">3</div>
                `,
                initLog: '网络核心路由器已上线，等待启动报文传输测试。'
            },
            'topology_demo': {
                title: '🎯 灾难对比：星型/总线/网状抗风险能力',
                html: `
                    <div style="position:absolute; top:20px; left:20px; width:150px; text-align:center; color:#38bdf8; font-weight:bold; font-size:12px;">星型 (Star)</div>
                    <div style="position:absolute; top:20px; left:195px; width:150px; text-align:center; color:#facc15; font-weight:bold; font-size:12px;">总线型 (Bus)</div>
                    <div style="position:absolute; top:20px; left:370px; width:150px; text-align:center; color:#10b981; font-weight:bold; font-size:12px;">网状型 (Mesh)</div>
                    
                    <svg xmlns="http://www.w3.org/2000/svg" style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:0;">
                        <line id="s-l1" x1="95" y1="150" x2="95" y2="80" stroke="#38bdf8" stroke-width="2" style="transition:0.3s;" />
                        <line id="s-l2" x1="95" y1="150" x2="45" y2="210" stroke="#38bdf8" stroke-width="2" style="transition:0.3s;" />
                        <line id="s-l3" x1="95" y1="150" x2="145" y2="210" stroke="#38bdf8" stroke-width="2" style="transition:0.3s;" />
                        
                        <line id="b-main" x1="200" y1="110" x2="340" y2="110" stroke="#facc15" stroke-width="4" style="transition:0.3s;" />
                        <line id="b-l1" x1="230" y1="110" x2="230" y2="180" stroke="#facc15" stroke-width="2" style="transition:0.3s;" />
                        <line id="b-l2" x1="270" y1="110" x2="270" y2="180" stroke="#facc15" stroke-width="2" style="transition:0.3s;" />
                        <line id="b-l3" x1="310" y1="110" x2="310" y2="180" stroke="#facc15" stroke-width="2" style="transition:0.3s;" />
                        
                        <line id="m-1" x1="410" y1="80" x2="490" y2="80" stroke="#10b981" stroke-width="2" style="transition:0.3s;" />
                        <line id="m-2" x1="410" y1="200" x2="490" y2="200" stroke="#10b981" stroke-width="2" style="transition:0.3s;" />
                        <line id="m-3" x1="410" y1="80" x2="410" y2="200" stroke="#10b981" stroke-width="2" style="transition:0.3s;" />
                        <line id="m-4" x1="490" y1="80" x2="490" y2="200" stroke="#10b981" stroke-width="2" style="transition:0.3s;" />
                        <line id="m-5" x1="410" y1="80" x2="490" y2="200" stroke="#10b981" stroke-width="2" style="transition:0.3s;" />
                        <line id="m-6" x1="490" y1="80" x2="410" y2="200" stroke="#10b981" stroke-width="2" style="transition:0.3s;" />
                    </svg>

                    <div id="s-hub" class="net-node" style="top:130px; left:75px; width:40px; height:40px; border-color:#38bdf8;">C</div>
                    <div class="net-node" style="top:65px; left:80px; width:30px; height:30px; border-color:#38bdf8;"></div>
                    <div class="net-node" style="top:195px; left:30px; width:30px; height:30px; border-color:#38bdf8;"></div>
                    <div class="net-node" style="top:195px; left:130px; width:30px; height:30px; border-color:#38bdf8;"></div>

                    <div class="net-node" style="top:180px; left:215px; width:30px; height:30px; border-color:#facc15;"></div>
                    <div class="net-node" style="top:180px; left:255px; width:30px; height:30px; border-color:#facc15;"></div>
                    <div class="net-node" style="top:180px; left:295px; width:30px; height:30px; border-color:#facc15;"></div>

                    <div class="net-node" style="top:65px; left:395px; width:30px; height:30px; border-color:#10b981;">A</div>
                    <div class="net-node" style="top:65px; left:475px; width:30px; height:30px; border-color:#10b981;">B</div>
                    <div class="net-node" style="top:185px; left:395px; width:30px; height:30px; border-color:#10b981;">D</div>
                    <div class="net-node" style="top:185px; left:475px; width:30px; height:30px; border-color:#10b981;">C</div>
                    
                    <div id="pkt-mesh" class="net-packet" style="width:14px; height:14px; top:73px; left:403px; background:#facc15;"></div>
                `,
                initLog: '全景对比：星型、总线、网状三大核心拓扑已连接。'
            }
        };

        function loadScenario(scen, btn) {
            if(btn.classList.contains('active-btn')) { closeSandbox(); return; }
            currentScenario = scen; currentStep = 0;
            document.querySelectorAll('.demo-trigger-btn').forEach(b => { b.classList.remove('active-btn'); b.innerText = b.innerText.replace('收起', '启动'); });
            btn.classList.add('active-btn'); btn.innerText = btn.innerText.replace('启动', '收起');
            btn.insertAdjacentElement('afterend', document.getElementById('anim-panel'));
            document.getElementById('anim-panel').style.display = 'flex';
            document.getElementById('anim-title').innerText = scenarioData[scen].title;
            document.getElementById('anim-canvas').innerHTML = scenarioData[scen].html;
            consoleEl.innerHTML = ''; logMsg('Sys', scenarioData[scen].initLog);
            document.getElementById('next-btn').disabled = false; document.getElementById('next-btn').style.background = "#059669";
            applyScaling();
        }

        function resetAnim() { if(currentScenario) { const btn = document.querySelector('.demo-trigger-btn.active-btn'); if(btn) { btn.classList.remove('active-btn'); loadScenario(currentScenario, btn); } } }

        function playAnimStep() {
            if (currentScenario === 'def_demo') {
                const pkt = document.getElementById('def-pkt');
                if (currentStep === 0) {
                    logMsg('请求建立', '独立的 主机A 发起资源请求。物理链路连通。');
                    document.getElementById('def-l1').setAttribute('stroke', '#3fb950');
                    pkt.style.opacity = '1';
                    pkt.style.left = '235px'; pkt.style.top = '165px'; // 飞向交换机 (270-10, 175-10)
                } else if (currentStep === 1) {
                    logMsg('协议转发', '网络软件(交换机协议)通过查表，精准将其送达 资源服务器。');
                    document.getElementById('def-l2').setAttribute('stroke', '#facc15');
                    pkt.style.left = '400px'; pkt.style.top = '165px';
                } else if (currentStep === 2) {
                    logMsg('资源获取', '信息传递成功！服务器响应该请求，体现计算机网络的核心“目的”。');
                    pkt.style.background = '#facc15';
                    pkt.style.boxShadow = '0 0 10px #facc15';
                    document.getElementById('def-n1').style.borderColor = '#facc15';
                    document.getElementById('def-n1').innerHTML = '主机 A<br/><span style="color:#facc15">获得资源</span>';
                    
                    document.getElementById('next-btn').disabled = true; document.getElementById('next-btn').style.background = "#374151";
                }
            } 
            else if (currentScenario === 'geo_scope_demo') {
                if(currentStep === 0) {
                    document.getElementById('box-pan').style.opacity = '1';
                    logMsg("PAN 建立", "个人工作区域网：蓝牙耳机连手机，覆盖几米距离。");
                } else if (currentStep === 1) {
                    document.getElementById('box-lan').style.opacity = '1';
                    logMsg("LAN 接入", "局域网：PC 接入家庭/企业 Wi-Fi 路由器，覆盖一栋大楼。");
                } else if (currentStep === 2) {
                    document.getElementById('box-man').style.opacity = '1';
                    logMsg("MAN 互联", "城域网：城市光纤汇聚了众多LAN，覆盖整个市区（5-50公里）。");
                } else if (currentStep === 3) {
                    document.getElementById('box-wan').style.opacity = '1';
                    logMsg("WAN 扩展", "广域网：国家级跨海光缆互联，这正是庞大 因特网(Internet) 的骨干！");
                    document.getElementById('next-btn').disabled = true; document.getElementById('next-btn').style.background = "#374151";
                }
            }
            else if (currentScenario === 'switching_demo') {
                const cPkt = document.getElementById('pkt-c');
                const p1 = document.getElementById('pkt-p1'), p2 = document.getElementById('pkt-p2'), p3 = document.getElementById('pkt-p3');
                
                if(currentStep === 0) {
                    logMsg("电路交换 1", "像打电话一样，在源和目标之间强制建立并独占一条物理链路。");
                    document.getElementById('circuit-line').style.opacity = '1';
                } else if (currentStep === 1) {
                    logMsg("电路交换 2", "整块数据不可分割，延固定通道顺序到达。极度稳定但浪费资源。");
                    cPkt.style.opacity = '1';
                    cPkt.style.left = '162px'; cPkt.style.top = '81px'; // To R1
                    setTimeout(() => { cPkt.style.left = '342px'; cPkt.style.top = '81px'; }, 800); // To R2
                    setTimeout(() => { cPkt.style.left = '445px'; cPkt.style.top = '166px'; }, 1600); // To Dest
                } else if (currentStep === 2) {
                    logMsg("分组交换 1", "通信完毕拆除专属通道。准备演示目前因特网所用的【分组交换】...");
                    cPkt.style.opacity = '0';
                    document.getElementById('circuit-line').style.opacity = '0';
                } else if (currentStep === 3) {
                    logMsg("分组交换 2", "数据被切分成小块(分组)。每个包互不干扰，动态计算最优路径，并发前行！");
                    p1.style.opacity = '1'; p2.style.opacity = '1'; p3.style.opacity = '1';
                    
                    // P1: R1 -> R2 -> Dst
                    p1.style.left = '172px'; p1.style.top = '82px';
                    setTimeout(() => { p1.style.left = '352px'; p1.style.top = '82px'; }, 800);
                    setTimeout(() => { p1.style.left = '462px'; p1.style.top = '167px'; }, 1600);
                    
                    // P2: R3 -> R4 -> Dst
                    p2.style.left = '172px'; p2.style.top = '252px';
                    setTimeout(() => { p2.style.left = '352px'; p2.style.top = '252px'; }, 800);
                    setTimeout(() => { p2.style.left = '462px'; p2.style.top = '167px'; }, 1600);
                    
                    // P3: R1 -> R4 (交叉) -> Dst
                    p3.style.left = '172px'; p3.style.top = '82px';
                    setTimeout(() => { p3.style.left = '352px'; p3.style.top = '252px'; }, 800);
                    setTimeout(() => { p3.style.left = '462px'; p3.style.top = '167px'; }, 1600);
                    
                    document.getElementById('next-btn').disabled = true; document.getElementById('next-btn').style.background = "#374151";
                }
            }
            else if (currentScenario === 'topology_demo') {
                const pkt = document.getElementById('pkt-mesh');
                if(currentStep === 0) {
                    logMsg("星型故障", "【单点故障】模拟：中心路由器宕机！周边所有设备全部失联瘫痪。");
                    document.getElementById('s-hub').style.background = "#ef4444";
                    document.getElementById('s-hub').style.borderColor = "#ef4444";
                    document.getElementById('s-hub').innerText = "死机";
                    ['s-l1','s-l2','s-l3'].forEach(id => document.getElementById(id).setAttribute('stroke', '#4b5563'));
                } else if (currentStep === 1) {
                    logMsg("总线故障", "【主干断裂】模拟：总线(中间这根长绳)被挖断，挂载在上面的设备全体断网！");
                    document.getElementById('b-main').setAttribute('stroke', '#ef4444');
                    ['b-l1','b-l2','b-l3'].forEach(id => document.getElementById(id).setAttribute('stroke', '#4b5563'));
                } else if (currentStep === 2) {
                    logMsg("网状阻断", "【局部断路】模拟网状拓扑：A 到 B 的直连物理线缆被物理切断。网络崩溃了吗？");
                    document.getElementById('m-1').setAttribute('stroke', '#ef4444');
                    document.getElementById('m-1').setAttribute('stroke-dasharray', '5,5');
                } else if (currentStep === 3) {
                    logMsg("网状自愈", "动态路由发挥作用！数据包自动绕道 D -> C -> B 抵达终点！展现了因特网最硬核的生存能力。");
                    pkt.style.opacity = '1';
                    // A(410,80) -> D(410,200)
                    pkt.style.left = '403px'; pkt.style.top = '193px'; 
                    document.getElementById('m-3').setAttribute('stroke', '#facc15');
                    
                    // D(410,200) -> C(490,200)
                    setTimeout(() => { 
                        pkt.style.left = '483px'; pkt.style.top = '193px';
                        document.getElementById('m-2').setAttribute('stroke', '#facc15');
                    }, 800);
                    
                    // C(490,200) -> B(490,80)
                    setTimeout(() => { 
                        pkt.style.left = '483px'; pkt.style.top = '73px';
                        document.getElementById('m-4').setAttribute('stroke', '#facc15');
                    }, 1600);

                    document.getElementById('next-btn').disabled = true; document.getElementById('next-btn').style.background = "#374151";
                }
            }
            currentStep++;
        }
    </script>
</body>
</html>




[========================================]

# 第二部分：⚠️ 强制执行约束 (Guardrails)
在生成新章节代码时，你必须严格继承参考示例的基因，且绝不妥协：
1. 绝对反偷懒：新正文必须【逐字逐句、连标点符号都不许少】地保留！严禁为了省事而总结、删减或合并段落！
2. 原汁原味架构：直接原样复用“参考示例”中的 CSS 样式、双引擎高亮和等比缩放 JS 函数。绝对不许引入任何外部渲染库。
3. 同等导演级剧本：针对新知识点，你必须设计与示例中同等复杂度（至少 3-4 步推演、包含并发和状态突变）的底层 DOM 动画。
4. 防截断：最终输出必须用“五级反引号”（`````html 和 `````）包裹全局代码。

# 第三部分：🚀 全新转换任务 (New Task)
现在，请你“清空”参考示例里的正文和 scenarioData，保留其最纯正的架构骨架和 UI 组件，为以下全新的 Markdown 教程生成一份顶级的交互式网页：

==================== 下面是新的 Markdown/word 正文 ====================



```