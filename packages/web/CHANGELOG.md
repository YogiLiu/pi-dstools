# @pi-dstools/web

## 0.1.2

### Patch Changes

- Updated dependencies []:
  - @pi-dstools/fetch@0.1.2
  - @pi-dstools/search@0.1.2

## 0.1.1

### Patch Changes

- [#4](https://github.com/YogiLiu/pi-dstools/pull/4) [`c4b6108`](https://github.com/YogiLiu/pi-dstools/commit/c4b6108d8e60803b5000dd2ff880fdef50f1090e) Thanks [@YogiLiu](https://github.com/YogiLiu)! - Show concise Pi extension labels for the web, search, and fetch packages.
- Updated dependencies [[`c4b6108`](https://github.com/YogiLiu/pi-dstools/commit/c4b6108d8e60803b5000dd2ff880fdef50f1090e)]:
  - @pi-dstools/fetch@0.1.1
  - @pi-dstools/search@0.1.1

## 0.1.0

### Added

- Initial release of `@pi-dstools/web`: one Pi package that installs both `ds_search` and `ds_fetch`.
- `ds_search` searches the web with DeepSeek's official Search API and can save full page text to temporary Markdown files for Pi to read.
- `ds_fetch` fetches an HTTP or HTTPS page with DeepSeek's official Fetch API, showing short pages inline and saving longer pages with a heading table or bounded preview.
- Both tools can be enabled or disabled independently with `pi config`.
- Search results and fetched pages are treated as untrusted external text.
