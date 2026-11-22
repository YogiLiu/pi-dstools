import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import ocrExtension from "../src/index";

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- ExtensionAPI is a mutable host interface
export default function (pi: ExtensionAPI) {
  ocrExtension(pi);
}
