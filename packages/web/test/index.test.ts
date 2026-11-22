import { describe, expect, it, vi } from "vitest";

import { hostCast } from "../../deepseek/test/fixtures";
import fetchExtension from "../extensions/fetch/index";
import searchExtension from "../extensions/search/index";

function registersSearchThroughWebPackage() {
  const registerTool = vi.fn<(tool: unknown) => void>();
  searchExtension(hostCast({ registerTool }));
  expect(registerTool).toHaveBeenCalledTimes(1);
  expect(registerTool).toHaveBeenCalledWith(expect.objectContaining({ name: "ds_search" }));
}

function registersFetchThroughWebPackage() {
  const registerTool = vi.fn<(tool: unknown) => void>();
  fetchExtension(hostCast({ registerTool }));
  expect(registerTool).toHaveBeenCalledTimes(1);
  expect(registerTool).toHaveBeenCalledWith(expect.objectContaining({ name: "ds_fetch" }));
}

describe("web package Pi integration", () => {
  it("registers ds_search through its own extension entry point", registersSearchThroughWebPackage);
  it("registers ds_fetch through its own extension entry point", registersFetchThroughWebPackage);
});
