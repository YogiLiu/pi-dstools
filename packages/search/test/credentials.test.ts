import {
  assertOfficialDeepSeekEndpoint,
  DEEPSEEK_OFFICIAL_ORIGIN,
  DEEPSEEK_PROVIDER_ID,
  DeepSeekToolError,
  isOfficialDeepSeekBaseUrl,
  resolveDeepSeekApiKey,
} from "@pi-dstools/deepseek";
import { describe, expect, it } from "vitest";

import {
  hostCast,
  makeRegistry,
  messageOf,
  rejectedError,
  rejectedSync,
  type RegistryAuth,
} from "./helpers";

const IDENTITY = { toolName: "ds_search", apiName: "Search" } as const;

async function usesResolvedKeyWithoutCredentialDiscovery() {
  const { registry, getProviderAuth } = makeRegistry({
    auth: { auth: { apiKey: "runtime-key" } },
  });
  await expect(resolveDeepSeekApiKey(registry, IDENTITY.toolName)).resolves.toBe("runtime-key");
  expect(getProviderAuth).toHaveBeenCalledWith(DEEPSEEK_PROVIDER_ID);
  expect("readStoredCredential" in registry).toBe(false);
  expect("getProviderAuthStatus" in registry).toBe(false);
}

async function reportsMissingCredentials() {
  const cases: RegistryAuth[] = [
    { auth: {} },
    { auth: { apiKey: "" } },
    { auth: { apiKey: "   " } },
    { auth: { apiKey: hostCast(42) } },
  ];
  await Promise.all(
    cases.map(async (auth) => {
      const { registry } = makeRegistry({ auth });
      await expect(resolveDeepSeekApiKey(registry, IDENTITY.toolName)).rejects.toThrow(
        /^ds_search is installed but unavailable: Pi did not resolve credentials for its DeepSeek provider\.$/u,
      );
    }),
  );
  const { registry } = makeRegistry({ auth: "unresolved" });
  await expect(resolveDeepSeekApiKey(registry, IDENTITY.toolName)).rejects.toThrow(
    /installed but unavailable/u,
  );
}

async function reportsResolutionFailuresWithoutLeaks() {
  const failures: readonly unknown[] = [
    new Error("credential command failed"),
    new DeepSeekToolError("credential is stale", "auth"),
    { toString: () => "credential command failed" },
  ];
  await Promise.all(
    failures.map(async (failure) => {
      const { registry } = makeRegistry({ throwOnGetAuth: failure });
      const error = await rejectedError(resolveDeepSeekApiKey(registry, IDENTITY.toolName));
      const message = messageOf(error);
      expect(message).toMatch(
        /^ds_search is installed but unavailable: Pi could not resolve credentials for its DeepSeek provider/u,
      );
      expect(message).toMatch(/credential/u);
      expect(message).not.toContain("resolved-key");
      expect(message).not.toContain("/login deepseek");
      expect(message).not.toContain("DEEPSEEK_API_KEY");
      expect(message).not.toContain("models.json");
    }),
  );
}

function acceptsAbsentAndOfficialBaseUrls() {
  const values = [
    undefined,
    "",
    "   ",
    DEEPSEEK_OFFICIAL_ORIGIN,
    `${DEEPSEEK_OFFICIAL_ORIGIN}/`,
    `${DEEPSEEK_OFFICIAL_ORIGIN}/v1`,
    "HTTPS://API.DEEPSEEK.COM/v1",
    `${DEEPSEEK_OFFICIAL_ORIGIN}/v1?key=secret`,
  ];
  for (const value of values) {
    expect(isOfficialDeepSeekBaseUrl(value)).toBe(true);
    expect(() => {
      assertOfficialDeepSeekEndpoint(value, IDENTITY);
    }).not.toThrow();
  }
}

function rejectsNonOfficialBaseUrls() {
  const values = [
    "https://proxy.example.com",
    "http://api.deepseek.com",
    "https://api.deepseek.com.evil.test",
    "https://api.deepseek.com:444",
    "not a url",
  ];
  for (const value of values) {
    expect(isOfficialDeepSeekBaseUrl(value)).toBe(false);
  }
}

function explainsNonOfficialEndpoints() {
  const values = [
    "https://proxy.example.com/v1?key=secret",
    "http://api.deepseek.com",
    "not a url",
  ];
  for (const value of values) {
    const error = rejectedSync(() => {
      assertOfficialDeepSeekEndpoint(value, IDENTITY);
    });
    expect(error).toMatchObject({ kind: "endpoint" });
    const message = messageOf(error);
    expect(message).toMatch(
      /^ds_search is installed but unavailable: Pi connects to DeepSeek via/u,
    );
    expect(message).toContain(`official ${DEEPSEEK_OFFICIAL_ORIGIN} endpoint`);
    expect(message).not.toContain("secret");
    expect(message).not.toContain("/login deepseek");
    expect(message).not.toContain("models.json");
    expect(message).not.toContain("DEEPSEEK_API_KEY");
  }
}

describe("Pi's deepseek provider credentials", () => {
  it(
    "uses the key Pi resolved without any credential discovery of its own",
    usesResolvedKeyWithoutCredentialDiscovery,
  );
  it("reports a short reason when Pi has no usable credentials", reportsMissingCredentials);
  it(
    "reports resolution failures without leaking the key or giving setup advice",
    reportsResolutionFailuresWithoutLeaks,
  );
});

describe("official DeepSeek endpoint", () => {
  it("accepts an absent base URL and any official origin", acceptsAbsentAndOfficialBaseUrls);
  it(
    "rejects custom hosts, plaintext, custom ports, lookalike hosts, and malformed URLs",
    rejectsNonOfficialBaseUrls,
  );
  it(
    "explains unavailability with a short, key-free reason and no setup advice",
    explainsNonOfficialEndpoints,
  );
});
