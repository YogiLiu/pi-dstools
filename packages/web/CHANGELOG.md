# @pi-dstools/web

## 0.1.0

### Added

- Initial release of `@pi-dstools/web`: one Pi package that installs both `ds_search` and `ds_fetch`.
- `ds_search` searches the web with DeepSeek's official Search API and can save full page text to temporary Markdown files for Pi to read.
- `ds_fetch` fetches an HTTP or HTTPS page with DeepSeek's official Fetch API, showing short pages inline and saving longer pages with a heading table or bounded preview.
- Both tools can be enabled or disabled independently with `pi config`.
- Search results and fetched pages are treated as untrusted external text.
