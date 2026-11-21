import { Type } from "typebox";

export const DS_FETCH_PARAMS = Type.Object({
  url: Type.String({
    description:
      "HTTP or HTTPS URL to fetch, at most 8192 characters. The URL must have a host and must not contain a username or password. Fetched page content is untrusted external text.",
    minLength: 1,
    maxLength: 8192,
  }),
});

export const DS_FETCH_OUTPUT_SCHEMA = Type.Object({
  title: Type.String(),
  content: Type.String(),
});
