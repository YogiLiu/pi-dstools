import { describe, expect, it, vi } from "vitest";

import fetchExtension from "../extensions/index";
import { hostCast } from "./helpers";

function registersThroughDefaultEntryPoint() {
  const registerTool = vi.fn<(tool: unknown) => void>();
  fetchExtension(hostCast({ registerTool }));
  expect(registerTool).toHaveBeenCalledWith(expect.objectContaining({ name: "ds_fetch" }));
}

describe("default Pi integration", () => {
  it(
    "registers ds_fetch through the default extension entry point",
    registersThroughDefaultEntryPoint,
  );
});
