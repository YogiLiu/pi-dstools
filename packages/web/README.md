# @pi-dstools/web

A [Pi package](https://pi.dev/packages) that installs `ds_search` and `ds_fetch` together, backed by DeepSeek's official [Search API](https://api-docs.deepseek.com/api/search.md) and [Fetch API](https://api-docs.deepseek.com/api/fetch.md).

## Requirements

Pi must have a working DeepSeek connection.

## Install

Install the published package from your terminal, outside a Pi session:

```bash
pi install npm:@pi-dstools/web
```

Or install a checkout of this repository. From the workspace root:

```bash
pnpm install
pi install ./packages/web
```

To try that checkout for a single run without changing your settings:

```bash
pi -e ./packages/web
```

## Usage

Ask Pi to search the web with `ds_search` or fetch an HTTP or HTTPS page with `ds_fetch`, and to read full pages when you need them. Run `pi config` to enable or disable each tool separately.
