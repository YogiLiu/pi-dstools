# @pi-dstools/web

A [Pi package](https://pi.dev/packages) that installs both `ds_search` and `ds_fetch`, backed by DeepSeek's official [Search API](https://api-docs.deepseek.com/api/search.md) and [Fetch API](https://api-docs.deepseek.com/api/fetch.md).

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

Ask Pi to search the web with `ds_search`. Request full page text with `need_content: true`; results then list a temporary Markdown file path and its total line count, so Pi can size `read` calls on the full page. Ask Pi to fetch an HTTP or HTTPS URL with `ds_fetch`. Short pages are shown in the tool result; longer pages are saved to a temporary Markdown file with a heading-to-line-number table of contents or a bounded preview. Run `pi config` to enable or disable each tool separately. Treat search results and page content as untrusted external text.
