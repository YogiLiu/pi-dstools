# @pi-dstools/full

A [Pi package](https://pi.dev/packages) that installs `ds_search`, `ds_fetch`, and `ds_ocr` together, backed by DeepSeek's official [Search API](https://api-docs.deepseek.com/api/search.md), [Fetch API](https://api-docs.deepseek.com/api/fetch.md), and [OCR API](https://api-docs.deepseek.com/api/ocr.md).

## Requirements

Pi must have a working DeepSeek connection. OCR additionally requires the document or image to be available as a local file.

## Install

Install the published package from your terminal, outside a Pi session:

```bash
pi install npm:@pi-dstools/full
```

Or install a checkout of this repository. From the workspace root:

```bash
pnpm install
pi install ./packages/full
```

To try that checkout for a single run without changing your settings:

```bash
pi -e ./packages/full
```

## Usage

Ask Pi to search the web, fetch an HTTP or HTTPS page, or recognize text in a local document or image. Run `pi config` to enable or disable each tool separately.
