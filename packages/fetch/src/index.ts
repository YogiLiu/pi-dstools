import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { createDsFetchTool } from "./tool";

export { createDsFetchTool } from "./tool";
export type { DsFetchDependencies } from "./tool";

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- ExtensionAPI is a mutable host interface
export default function (pi: ExtensionAPI) {
  pi.registerTool(createDsFetchTool());
}
