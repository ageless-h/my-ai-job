# zhipin 静态抓取产物

目标页面：`https://www.zhipin.com/web/geek/jobs?ka=header-jobs`

## 已生成文件

- `temp/zhipin-static.html`：原始 HTTP 抓取的 HTML（包含站点脚本）。
- `temp/zhipin-static-noscript.html`：去掉 `<script>` 后的静态快照（便于本地稳定查看结构）。
- `temp/zhipin-rendered.html`：从真实在线页导出的渲染后 DOM 快照。
- `temp/zhipin-rendered-noscript.html`：从渲染后 DOM 再去脚本得到的稳定快照。
- `temp/zhipin-headers.txt`：抓取时的响应头。
- `temp/http-server.log`：本地静态服务日志。

## 关键静态信息（来自 `zhipin-static.html`）

- 页面标题：`BOSS直聘`
- SPA 静态资源根：`https://static.zhipin.com/fe-zhipin-geek/web/spa/v6464/`
- 主容器：`<div id="app">`
- 初始骨架：包含 `page-loading` 与 “加载中，请稍候”
- 主要打包资源：
  - `.../static/css/zp-boss.80fffb17.css`
  - `.../static/css/boss-ui.80fffb17.css`
  - `.../static/css/app.80fffb17.css`
  - `.../static/js/rxjs.80fffb17.js`
  - `.../static/js/zp-boss.80fffb17.js`
  - `.../static/js/boss-ui.80fffb17.js`
  - `.../static/js/app.80fffb17.js`

## 本地浏览方式

1. 启动静态服务（项目根目录）：

```bash
python -m http.server 4310 --directory temp
```

2. 浏览器打开：

- 原始抓取页（会执行远端脚本，可能跳回线上站点）：
  - `http://127.0.0.1:4310/zhipin-static.html`
- 推荐用于静态检查的去脚本快照：
  - `http://127.0.0.1:4310/zhipin-static-noscript.html`
  - `http://127.0.0.1:4310/zhipin-rendered-noscript.html`

## 可复用抓取流程（真实渲染 DOM）

1. 先拿静态壳（用于资源信息与骨架对照）：

```bash
curl -L "https://www.zhipin.com/web/geek/jobs?ka=header-jobs" -o "temp/zhipin-static.html"
curl -I "https://www.zhipin.com/web/geek/jobs?ka=header-jobs" > "temp/zhipin-headers.txt"
```

2. 在浏览器真实打开目标页，等待渲染完成后导出 `html.outerHTML` 到 `temp/zhipin-rendered.html`。

3. 从渲染版生成去脚本快照：

```bash
node -e "const fs=require('fs');const html=fs.readFileSync('temp/zhipin-rendered.html','utf8');const out=html.replace(/<script\\b[^>]*>[\\s\\S]*?<\\/script>/gi,'').replace(/<noscript\\b[^>]*>[\\s\\S]*?<\\/noscript>/gi,'');fs.writeFileSync('temp/zhipin-rendered-noscript.html',out,'utf8');"
```

4. 本地服务验证：

```bash
python -m http.server 4310 --directory temp
```

打开 `http://127.0.0.1:4310/zhipin-rendered-noscript.html`，并检查关键节点是否存在：

- 站点侧边入口：`.zp-side-entry-question`
- 插件入口按钮：`.ai-fab`（示例样式：`right: 24px; bottom: 108px;`）

## 本次重叠问题取证结果

- 真实在线页可抓到：`.zp-side-entry-question`（你提供的“咨询客服/下载APP/微信服务号/微博号”节点）。
- 真实在线页可抓到：`.ai-fab`（你提供的 SVG 机器人按钮节点）。
- 在 `zhipin-rendered-noscript.html` 本地页中，两者均可查询到，且尺寸非 0（示例：`46x46` 与 `44x44`），可见性成立。
