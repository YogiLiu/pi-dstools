import { describe, expect, it, vi } from "vitest";

import { hostCast } from "../../deepseek/test/fixtures";
import fetchExtension from "../extensions/fetch/index";
import ocrExtension from "../extensions/ocr/index";
import searchExtension from "../extensions/search/index";

function registersSearchThroughFullPackage() {
  const registerTool = vi.fn<(tool: unknown) => void>();
  searchExtension(hostCast({ registerTool }));
  expect(registerTool).toHaveBeenCalledTimes(1);
  expect(registerTool).toHaveBeenCalledWith(expect.objectContaining({ name: "ds_search" }));
}

function registersFetchThroughFullPackage() {
  const registerTool = vi.fn<(tool: unknown) => void>();
  fetchExtension(hostCast({ registerTool }));
  expect(registerTool).toHaveBeenCalledTimes(1);
  expect(registerTool).toHaveBeenCalledWith(expect.objectContaining({ name: "ds_fetch" }));
}

function registersOcrThroughFullPackage() {
  const registerTool = vi.fn<(tool: unknown) => void>();
  ocrExtension(hostCast({ registerTool }));
  expect(registerTool).toHaveBeenCalledTimes(1);
  expect(registerTool).toHaveBeenCalledWith(expect.objectContaining({ name: "ds_ocr" }));
}

describe("full package Pi integration", () => {
  it(
    "registers ds_search through its own extension entry point",
    registersSearchThroughFullPackage,
  );
  it("registers ds_fetch through its own extension entry point", registersFetchThroughFullPackage);
  it("registers ds_ocr through its own extension entry point", registersOcrThroughFullPackage);
});
