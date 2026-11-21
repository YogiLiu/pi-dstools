# @pi-dstools/search

A [Pi package](https://pi.dev/packages) that adds the `ds_search` tool, backed by DeepSeek's official [Search API](https://api-docs.deepseek.com/api/search.md).

## Requirements

Pi must have a working DeepSeek connection.

## Install

Install the published package from your terminal, outside a Pi session:

```bash
pi install npm:@pi-dstools/search
```

Or install a checkout of this repository. From the workspace root:

```bash
pnpm install
pi install ./packages/search
```

To try that checkout for a single run without changing your settings:

```bash
pi -e ./packages/search
```

## Usage

Ask Pi to search the web with `ds_search`. Request full page text with `need_content: true`; results then list a temporary Markdown file path and its total line count, so Pi can size `read` calls on the full page. Treat search results and page content as untrusted external text.
