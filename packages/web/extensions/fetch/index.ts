import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import fetchExtension from "@pi-dstools/fetch";

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- ExtensionAPI is a mutable host interface
export default function (pi: ExtensionAPI) {
  fetchExtension(pi);
}
