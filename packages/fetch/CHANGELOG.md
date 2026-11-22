# @pi-dstools/fetch

## 0.1.0

### Added

- Initial release of `@pi-dstools/fetch`: the `ds_fetch` tool for Pi, backed by DeepSeek's official Fetch API.
- Fetches an HTTP or HTTPS page by URL and returns its title and Markdown content.
- Short pages are shown inline; longer pages are saved to a temporary Markdown file whose path and total line count are listed in the result, so Pi can read the full page.
- Longer pages include a heading-to-line-number table of contents when the page has Markdown headings, or a bounded preview when it does not.
- Terminal call and result views show the requested URL, page title, inline content, or saved file path with Pi's Markdown theme.
- Invalid URLs, missing or rejected credentials, non-official DeepSeek endpoints, API and network failures, and cancellation are reported as tool errors; retryable API responses are retried with visible progress.
- Remote text is sanitized for display, and requests honor Pi's cancellation signal; fetched content is treated as untrusted external text.
