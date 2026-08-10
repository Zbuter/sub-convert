# SubConvert Frontend

一个零依赖、纯前端的 SubConverter 订阅转换链接生成器。

在线使用：[https://zbuter.github.io/sub-convert/](https://zbuter.github.io/sub-convert/)

## 功能

- 默认后端：`https://api.wcc.best`、`https://api.dler.io`
- 支持自定义 SubConverter 后端地址
- 默认远程配置：`https://raw.githubusercontent.com/Zbuter/clash-config-ini/refs/heads/main/config.ini`
- 支持自定义或关闭远程配置
- 支持多个订阅地址（每行一个）
- 覆盖 Clash、sing-box、Surge、Quantumult、Loon、Surfboard 及节点列表等输出类型
- 实时生成、一键复制或直接打开转换链接
- 配置保存在浏览器 `localStorage`，页面本身不会上传订阅地址

## 本地运行

项目不需要安装依赖。可以直接打开 `index.html`，也可以启动任意静态文件服务器：

```powershell
python -m http.server 4173
```

然后访问 `http://localhost:4173`。

## 部署

将以下文件部署到 GitHub Pages、Cloudflare Pages、Netlify、Vercel 或任意静态服务器即可：

- `index.html`
- `styles.css`
- `app.js`

## 注意

前端只负责生成 URL。转换请求由用户复制链接后或点击“打开”时直接发送到所选 SubConverter 后端；后端可用性、CORS 策略和订阅隐私策略由对应服务提供者决定。
