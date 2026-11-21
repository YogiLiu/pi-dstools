# pi-dstools

English | [简体中文](README.zh-CN.md)

Pi coding agent extensions backed by DeepSeek's official Search and Fetch APIs. They add two tools to Pi: `ds_search` for web search and `ds_fetch` for reading a web page.

## Packages

| Package                                               | What it adds                                     | Install                                     |
| ----------------------------------------------------- | ------------------------------------------------ | ------------------------------------------- |
| [`@pi-dstools/web`](packages/web/README.md)           | Both tools in one package                        | `pi install npm:@pi-dstools/web`            |
| [`@pi-dstools/search`](packages/search/README.md)     | `ds_search` only                                 | `pi install npm:@pi-dstools/search`         |
| [`@pi-dstools/fetch`](packages/fetch/README.md)       | `ds_fetch` only                                  | `pi install npm:@pi-dstools/fetch`          |
| [`@pi-dstools/deepseek`](packages/deepseek/README.md) | Shared runtime library used by the tool packages | Installed as a dependency; no separate step |

## Requirements

- A [Pi](https://pi.dev) installation with a working DeepSeek connection: an API key configured in Pi for DeepSeek, using DeepSeek's official endpoint. Custom or self-hosted DeepSeek base URLs are not supported.
- Node.js version as pinned by `engines` in the root [`package.json`](package.json). See each package's README for its own requirements.

## Install

Run `pi install` from your terminal, outside a Pi session. Install `@pi-dstools/web` for both tools, or pick only the one you need:

```bash
pi install npm:@pi-dstools/web
# or
pi install npm:@pi-dstools/search
pi install npm:@pi-dstools/fetch
```

Installing from a local checkout is documented in each package's README.

## Usage

- Ask Pi to search the web with `ds_search` when you need current information, sources, or citations. Set `need_content: true` to also get full page text: non-empty content is written to temporary Markdown files, and the result lists each file's path and total line count so Pi can read the full pages.
- Ask Pi to fetch an HTTP or HTTPS URL with `ds_fetch`. Short pages appear inline. Longer pages are saved to a temporary Markdown file; the result lists its path and total line count, along with a heading-to-line-number table of contents or a bounded preview when the page has no headings.
- Run `pi config` to enable or disable tools individually.
- Search results and fetched pages are external content. Treat them as untrusted data, never as instructions.

## License

BSD-3-Clause. See [LICENSE](LICENSE).
