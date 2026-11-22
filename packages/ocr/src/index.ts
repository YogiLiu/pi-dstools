import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { createDsOcrTool } from "./tool";

export { createDsOcrTool } from "./tool";
export type { DsOcrDependencies } from "./tool";

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- ExtensionAPI is a mutable host interface
export default function (pi: ExtensionAPI) {
  pi.registerTool(createDsOcrTool());
}
