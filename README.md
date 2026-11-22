<div align="center">

# pi-dstools

_Pi extensions powered by DeepSeek_

[![Quality](https://github.com/YogiLiu/pi-dstools/actions/workflows/quality.yml/badge.svg?branch=main)](https://github.com/YogiLiu/pi-dstools/actions/workflows/quality.yml)
[![npm version (@pi-dstools/web)](https://img.shields.io/npm/v/%40pi-dstools%2Fweb?label=%40pi-dstools%2Fweb)](https://www.npmjs.com/package/@pi-dstools/web)
[![npm version (@pi-dstools/search)](https://img.shields.io/npm/v/%40pi-dstools%2Fsearch?label=%40pi-dstools%2Fsearch)](https://www.npmjs.com/package/@pi-dstools/search)
[![npm version (@pi-dstools/fetch)](https://img.shields.io/npm/v/%40pi-dstools%2Ffetch?label=%40pi-dstools%2Ffetch)](https://www.npmjs.com/package/@pi-dstools/fetch)
[![License](https://img.shields.io/badge/License-BSD--3--Clause-blue?style=flat-square)](LICENSE)

English | [简体中文](README.zh-CN.md)

[Packages](#packages) • [Requirements](#requirements) • [Installation](#installation) • [Usage](#usage)

</div>

A collection of [Pi](https://pi.dev) packages backed by DeepSeek's APIs. Install the ones you need to give Pi new tools; [Packages](#packages) lists what is available today.

## Packages

| Package                                           | What it adds                                    |
| ------------------------------------------------- | ----------------------------------------------- |
| [`@pi-dstools/web`](packages/web/README.md)       | Web search and page fetching in one package     |
| [`@pi-dstools/search`](packages/search/README.md) | Find current information, sources and citations |
| [`@pi-dstools/fetch`](packages/fetch/README.md)   | Read the content of an HTTP or HTTPS page       |

## Requirements

- A [Pi](https://pi.dev) installation with a working DeepSeek connection: an API key configured in Pi for DeepSeek, using DeepSeek's official endpoint.
- Node.js version as pinned by `engines` in the root [`package.json`](package.json). Each package's README lists its own requirements.

> [!IMPORTANT]
> Custom or self-hosted DeepSeek base URLs are not supported.

## Installation

Run `pi install` from your terminal, outside a Pi session:

```bash
pi install npm:@pi-dstools/web
pi install npm:@pi-dstools/search
pi install npm:@pi-dstools/fetch
```

Instructions for installing a local checkout are in each package's README.

## Usage

Once installed, ask Pi in natural language; it picks the relevant tools on its own. For example:

```text
What changed in the latest Vitest release? Search the web and cite your sources.
Summarize this page for me: https://example.com/docs/getting-started
```

Currently available tools:

- `ds_search` — find current information, sources and citations, and read full pages when needed.
- `ds_fetch` — read the content of an HTTP or HTTPS page you provide.

Run `pi config` to enable or disable tools individually.
