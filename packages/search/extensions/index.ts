import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import searchExtension from "../src/index";

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- ExtensionAPI is a mutable host interface
export default function (pi: ExtensionAPI) {
  searchExtension(pi);
}
