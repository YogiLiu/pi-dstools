<div align="center">

# pi-dstools

_由 DeepSeek 驱动的 Pi 扩展_

[![Quality](https://github.com/YogiLiu/pi-dstools/actions/workflows/quality.yml/badge.svg?branch=main)](https://github.com/YogiLiu/pi-dstools/actions/workflows/quality.yml)
[![npm version (@pi-dstools/web)](https://img.shields.io/npm/v/%40pi-dstools%2Fweb?label=%40pi-dstools%2Fweb)](https://www.npmjs.com/package/@pi-dstools/web)
[![npm version (@pi-dstools/search)](https://img.shields.io/npm/v/%40pi-dstools%2Fsearch?label=%40pi-dstools%2Fsearch)](https://www.npmjs.com/package/@pi-dstools/search)
[![npm version (@pi-dstools/fetch)](https://img.shields.io/npm/v/%40pi-dstools%2Ffetch?label=%40pi-dstools%2Ffetch)](https://www.npmjs.com/package/@pi-dstools/fetch)
[![License](https://img.shields.io/badge/License-BSD--3--Clause-blue?style=flat-square)](LICENSE)

[English](README.md) | 简体中文

[软件包](#软件包) • [环境要求](#环境要求) • [安装](#安装) • [使用](#使用)

</div>

基于 DeepSeek API 的 [Pi](https://pi.dev) 软件包集合。按需安装即可为 Pi 增加新工具，当前可用的软件包见[软件包](#软件包)。

## 软件包

| 软件包                                            | 提供内容                       |
| ------------------------------------------------- | ------------------------------ |
| [`@pi-dstools/web`](packages/web/README.md)       | 一个包内提供网页搜索与页面抓取 |
| [`@pi-dstools/search`](packages/search/README.md) | 查找最新信息、来源与引用       |
| [`@pi-dstools/fetch`](packages/fetch/README.md)   | 读取 HTTP 或 HTTPS 页面的内容  |

## 环境要求

- 已安装 [Pi](https://pi.dev)，且 DeepSeek 连接可用：已在 Pi 中为 DeepSeek 配置 API key，并使用 DeepSeek 官方端点。
- Node.js 版本见根 [`package.json`](package.json) 中的 `engines`。各包的额外要求见对应的 README。

> [!IMPORTANT]
> 自定义或自建的 DeepSeek base URL 不受支持。

## 安装

在终端中、Pi 会话之外执行 `pi install`：

```bash
pi install npm:@pi-dstools/web
pi install npm:@pi-dstools/search
pi install npm:@pi-dstools/fetch
```

从本地仓库检出安装的方法见各软件包的 README。

## 使用

安装完成后，直接用自然语言向 Pi 提出需求，Pi 会自行选择相应工具。例如：

```text
最新的 Vitest 版本有哪些变更？搜索网页并给出来源。
帮我总结这个页面：https://example.com/docs/getting-started
```

当前可用的工具：

- `ds_search`：查找最新信息、来源与引用，需要时读取页面全文。
- `ds_fetch`：读取你提供的 HTTP 或 HTTPS 页面内容。

运行 `pi config` 可分别启用或禁用各个工具。
