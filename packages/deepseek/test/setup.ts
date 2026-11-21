import { setCapabilityOverrides } from "@earendil-works/pi-tui";
import { afterEach, beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.clearAllMocks();
  setCapabilityOverrides({});
});

afterEach(() => {
  setCapabilityOverrides({});
  vi.unstubAllGlobals();
});
