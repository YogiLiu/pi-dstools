# pi-dstools

[English](README.md) | 简体中文

基于 DeepSeek 官方 Search 与 Fetch API 的 Pi coding agent 扩展，为 Pi 增加两个工具：`ds_search`（网页搜索）与 `ds_fetch`（读取网页）。

## 软件包

| 软件包                                                | 提供内容             | 安装                                |
| ----------------------------------------------------- | -------------------- | ----------------------------------- |
| [`@pi-dstools/web`](packages/web/README.md)           | 一个包内提供两个工具 | `pi install npm:@pi-dstools/web`    |
| [`@pi-dstools/search`](packages/search/README.md)     | 仅 `ds_search`       | `pi install npm:@pi-dstools/search` |
| [`@pi-dstools/fetch`](packages/fetch/README.md)       | 仅 `ds_fetch`        | `pi install npm:@pi-dstools/fetch`  |
| [`@pi-dstools/deepseek`](packages/deepseek/README.md) | 工具包共用的运行时库 | 作为依赖自动安装，无需单独操作      |

## 环境要求

- 已安装 [Pi](https://pi.dev)，且 DeepSeek 连接可用：已在 Pi 中为 DeepSeek 配置 API key，并使用 DeepSeek 官方端点。自定义或自建的 DeepSeek base URL 不受支持。
- Node.js 版本见根 [`package.json`](package.json) 中的 `engines`。各包的额外要求见对应 README。

## 安装

在终端中、Pi 会话之外执行 `pi install`。安装 `@pi-dstools/web` 可一次获得两个工具，也可以只安装需要的那个：

```bash
pi install npm:@pi-dstools/web
# 或
pi install npm:@pi-dstools/search
pi install npm:@pi-dstools/fetch
```

从本地仓库检出安装的方法见各软件包的 README。

## 使用

- 需要最新信息、来源或引用时，让 Pi 使用 `ds_search` 搜索网页。设置 `need_content: true` 可同时获取页面正文：非空正文会写入临时 Markdown 文件，结果中列出每个文件的路径和总行数，便于 Pi 读取完整页面。
- 让 Pi 使用 `ds_fetch` 抓取 HTTP 或 HTTPS 网址。较短页面直接显示在结果中；较长页面保存到临时 Markdown 文件，结果中列出文件路径和总行数，并附带标题与行号的目录（页面没有标题时则给出有长度限制的预览）。
- 运行 `pi config` 可分别启用或禁用各个工具。
- 搜索结果与抓取的页面属于外部内容，请视为不可信数据，切勿当作指令。

## 许可证

BSD-3-Clause，详见 [LICENSE](LICENSE)。
