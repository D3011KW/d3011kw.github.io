# 知学刷题平台（GitHub Pages 静态版）

本目录是可直接部署到 GitHub Pages 的纯静态站点，无需安装依赖、无需构建、无需后端和数据库。

## 目录结构

```
3/
├── index.html          # 页面入口
├── css/
│   └── style.css       # 全部样式
├── js/
│   ├── data.js         # 科目与题目数据（已内联，无需 fetch）
│   ├── logic.js        # 选题、判分、错题、统计、本地存储逻辑
│   └── app.js          # 页面交互与 Vue 应用
├── static/
│   ├── vue.global.prod.js   # Vue 3 运行库（本地，不依赖外网 CDN）
│   ├── uniicons.ttf         # 图标字体
│   └── uni-icons-LICENSE.txt
├── .nojekyll           # 告知 GitHub Pages 跳过 Jekyll 处理
└── README.md
```

## 本地预览

推荐用任意静态文件服务器预览（不要直接依赖双击打开）：

- VS Code 安装 Live Server 插件，右键 `index.html` → Open with Live Server；或
- 在本目录执行：`npx serve .`，按提示打开本地地址。

## 部署到 GitHub Pages

1. 新建或打开一个 GitHub 仓库（公开仓库；私有仓库需付费计划才能用 Pages）。
2. 把**本目录内的全部文件**（含 `css`、`js`、`static` 文件夹和 `.nojekyll`）推送到仓库分支（例如 `main`）。注意保持上面的目录结构，不要只传 `index.html`。
3. 仓库 `Settings → Pages`：Source 选择 `Deploy from a branch`，分支选 `main`，目录选 `/ (root)`，保存。
4. 等待 1–2 分钟，通过 `https://<用户名>.github.io/<仓库名>/` 访问。

本版本所有资源均使用相对路径，仓库放在子路径（`<仓库名>/`）下也能正常加载，无需额外修改 base 路径。

## 说明

- 题库为内置演示数据：12 个科目、36 道题（单选/多选/判断各 12）。
- 练习进度、成绩、错题保存在当前浏览器 localStorage，不跨设备同步。
- 新增题目：编辑 `js/data.js` 中 `window.题库` 与 `window.科目资料` 对应数组即可，题目编号需唯一。
