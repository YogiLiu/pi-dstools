import { describe, expect, it, vi } from "vitest";

import ocrExtension from "../extensions/index";
import { hostCast } from "./helpers";

function registersThroughDefaultEntryPoint() {
  const registerTool = vi.fn<(tool: unknown) => void>();
  ocrExtension(hostCast({ registerTool }));
  expect(registerTool).toHaveBeenCalledTimes(1);
  expect(registerTool).toHaveBeenCalledWith(expect.objectContaining({ name: "ds_ocr" }));
}

describe("default Pi integration", () => {
  it(
    "registers ds_ocr through the default extension entry point",
    registersThroughDefaultEntryPoint,
  );
});
