# @pi-dstools/fetch

A [Pi package](https://pi.dev/packages) that adds the `ds_fetch` tool, backed by DeepSeek's official [Fetch API](https://api-docs.deepseek.com/api/fetch.md).

## Requirements

Pi must have a working DeepSeek connection.

## Install

Install the published package from your terminal, outside a Pi session:

```bash
pi install npm:@pi-dstools/fetch
```

Or install a checkout of this repository. From the workspace root:

```bash
pnpm install
pi install ./packages/fetch
```

To try that checkout for a single run without changing your settings:

```bash
pi -e ./packages/fetch
```

## Usage

Ask Pi to fetch an HTTP or HTTPS page with `ds_fetch` when you need its content.
