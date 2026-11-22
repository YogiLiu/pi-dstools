# @pi-dstools/ocr

A [Pi package](https://pi.dev/packages) that adds the `ds_ocr` tool, backed by DeepSeek's official [OCR API](https://api-docs.deepseek.com/api/ocr.md).

## Requirements

Pi must have a working DeepSeek connection, and the document or image must be available as a local file.

## Install

Install the published package from your terminal, outside a Pi session:

```bash
pi install npm:@pi-dstools/ocr
```

Or install a checkout of this repository. From the workspace root:

```bash
pnpm install
pi install ./packages/ocr
```

To try that checkout for a single run without changing your settings:

```bash
pi -e ./packages/ocr
```

## Usage

Ask Pi to recognize a local PDF, Word, PowerPoint, or image with `ds_ocr`. Provide a file path and optionally choose `text_recognition` or `rich_layout_recognition`. Short results are returned inline; longer results are saved to a temporary Markdown file whose path and total line count are returned, so Pi can read the full content with its built-in `read` tool.
