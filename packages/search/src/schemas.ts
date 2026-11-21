import { Type } from "typebox";

export const DS_SEARCH_PARAMS = Type.Object({
  query: Type.String({
    description:
      "Search query, 1-128 Unicode characters. Supports site:, quoted phrases, lang:, after:, and before: operators.",
    minLength: 1,
    maxLength: 128,
  }),
  count: Type.Optional(
    Type.Integer({
      description: "Number of results to return, from 1 to 50. Defaults to 10.",
      minimum: 1,
      maximum: 50,
      default: 10,
    }),
  ),
  ori_question: Type.Optional(
    Type.Union([
      Type.String({
        description: "Original user question that triggered this search, 1-128 Unicode characters.",
        minLength: 1,
        maxLength: 128,
      }),
      Type.Null(),
    ]),
  ),
  localization: Type.Optional(
    Type.String({
      description: "Optional IPv4 or IPv6 address used to localize results.",
    }),
  ),
  need_content: Type.Optional(
    Type.Boolean({
      description:
        "Request full page content. Non-empty content is saved to a temporary Markdown file.",
      default: false,
    }),
  ),
});

const SEARCH_RESULT_SCHEMA = Type.Object({
  rerank_score: Type.Number({ minimum: 0, maximum: 3 }),
  title: Type.String(),
  url: Type.String(),
  snippet: Type.String(),
  summary: Type.String(),
  content: Type.String(),
  site_name: Type.Union([Type.String(), Type.Null()]),
  site_icon: Type.Union([Type.String(), Type.Null()]),
  date: Type.Union([Type.String(), Type.Null()]),
  authority: Type.Integer({ minimum: -1, maximum: 4 }),
});

export const DS_SEARCH_OUTPUT_SCHEMA = Type.Array(SEARCH_RESULT_SCHEMA);
