export const MAX_OCR_FILE_BYTES = 100 * 1024 * 1024;
export const OCR_PURPOSES = ["text_recognition", "rich_layout_recognition"] as const;
export const OCR_FINISH_REASONS = ["stop", "length"] as const;
export const DEFAULT_OCR_PURPOSE = "text_recognition" as const;
export const OCR_RESULT_OBJECT = "ocr.result" as const;
