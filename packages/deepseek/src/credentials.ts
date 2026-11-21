import { DEEPSEEK_OFFICIAL_ORIGIN, DEEPSEEK_PROVIDER_ID } from "./constants";
import { DeepSeekToolError, toUserMessage } from "./errors";
import type {
  CredentialRegistry,
  DeepSeekToolContext,
  PreparedToolCall,
  ToolIdentity,
} from "./types";

export async function resolveDeepSeekApiKey(
  registry: CredentialRegistry,
  toolName: string,
): Promise<string> {
  let auth: Awaited<ReturnType<CredentialRegistry["getProviderAuth"]>>;
  try {
    auth = await registry.getProviderAuth(DEEPSEEK_PROVIDER_ID);
  } catch (error) {
    throw new DeepSeekToolError(
      `${toolName} is installed but unavailable: Pi could not resolve credentials for its DeepSeek provider (${toUserMessage(error)}).`,
      "auth",
    );
  }

  const apiKey = auth?.auth.apiKey;
  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    throw new DeepSeekToolError(
      `${toolName} is installed but unavailable: Pi did not resolve credentials for its DeepSeek provider.`,
      "auth",
    );
  }
  return apiKey;
}

function configuredBaseUrl(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function isOfficialDeepSeekBaseUrl(value: string | undefined): boolean {
  const configured = configuredBaseUrl(value);
  if (configured === undefined) return true;
  try {
    return new URL(configured).origin === DEEPSEEK_OFFICIAL_ORIGIN;
  } catch {
    return false;
  }
}

function endpointOrigin(value: string): string {
  try {
    return new URL(value.trim()).origin;
  } catch {
    return "(invalid URL)";
  }
}

export function assertOfficialDeepSeekEndpoint(
  baseUrl: string | undefined,
  identity: ToolIdentity,
): void {
  const configured = configuredBaseUrl(baseUrl);
  if (configured === undefined || isOfficialDeepSeekBaseUrl(configured)) return;
  throw new DeepSeekToolError(
    `${identity.toolName} is installed but unavailable: Pi connects to DeepSeek via ${endpointOrigin(configured)}, not the official ${DEEPSEEK_OFFICIAL_ORIGIN} endpoint. This tool only works with DeepSeek's official ${identity.apiName} API.`,
    "endpoint",
  );
}

export async function prepareDeepSeekToolCall(
  ctx: DeepSeekToolContext,
  identity: ToolIdentity,
  signal: Readonly<AbortSignal> | undefined,
): Promise<PreparedToolCall> {
  assertOfficialDeepSeekEndpoint(
    ctx.modelRegistry.getProvider(DEEPSEEK_PROVIDER_ID)?.baseUrl,
    identity,
  );
  const apiKey = await resolveDeepSeekApiKey(ctx.modelRegistry, identity.toolName);
  return { apiKey, signal: signal ?? ctx.signal };
}
