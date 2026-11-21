import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { createDsSearchTool } from "./tool";

export { createDsSearchTool } from "./tool";
export type { DsSearchDependencies } from "./tool";

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- ExtensionAPI is a mutable host interface
export default function (pi: ExtensionAPI) {
  pi.registerTool(createDsSearchTool());
}
