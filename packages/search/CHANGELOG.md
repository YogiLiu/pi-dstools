# Changelog

## [0.1.0] - 2026-11-22

### Added

- Initial release of `@pi-dstools/search`: the `ds_search` tool for Pi, backed by DeepSeek's official Search API.
- Web searches with a query, result count, original question, and optional IP-based result localization.
- Structured results with titles, links, site names, dates, snippets, summaries, and quality and authority labels.
- `need_content` saves non-empty page text to temporary Markdown files and lists each path with its total line count, so Pi can read the full pages.
- Terminal results with clickable title links where the terminal supports hyperlinks, expandable to show all results, styled with Pi's Markdown theme.
- Retryable API responses are retried with visible progress, and requests honor Pi's cancellation signal.
- Invalid input, missing or rejected credentials, non-official DeepSeek endpoints, API and network failures, and cancellation are reported as tool errors.
- Remote text is sanitized for display and treated as untrusted external content.
