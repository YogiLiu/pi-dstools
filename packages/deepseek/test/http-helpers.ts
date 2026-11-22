import { DEEPSEEK_OCR_URL, DEEPSEEK_SEARCH_URL, type HttpHeaders } from "../src/index";

export function headers(values: Readonly<Record<string, string>>): HttpHeaders {
  return { get: (name) => values[name.toLowerCase()] ?? null };
}

export function baseOptions() {
  return {
    endpoint: DEEPSEEK_SEARCH_URL,
    apiName: "Search" as const,
    apiKey: "key",
    body: { query: "DeepSeek" },
  };
}

export function baseFormOptions() {
  const formData = new FormData();
  formData.append("purpose", "text_recognition");
  formData.append("file", new Blob(["hello"]), "doc.pdf");
  return {
    endpoint: DEEPSEEK_OCR_URL,
    apiName: "OCR" as const,
    apiKey: "key",
    formData,
  };
}
