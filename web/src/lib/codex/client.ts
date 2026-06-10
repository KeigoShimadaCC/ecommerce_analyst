import {
  Codex,
  type CodexOptions,
  type ModelReasoningEffort,
  type ThreadOptions
} from "@openai/codex-sdk";

export const CODEX_AUTH_MODE_ENV = "CODEX_AUTH_MODE";
export const OPENAI_API_KEY_ENV = "OPENAI_API_KEY";
export const OPENAI_MODEL_ENV = "OPENAI_MODEL";
export const OPENAI_REASONING_EFFORT_ENV = "OPENAI_REASONING_EFFORT";

export const CODEX_ENV_NAMES = [
  CODEX_AUTH_MODE_ENV,
  OPENAI_API_KEY_ENV,
  OPENAI_MODEL_ENV,
  OPENAI_REASONING_EFFORT_ENV
] as const;

export const CODEX_TURN_TIMEOUT_MS = 120_000;
export const DEFAULT_API_MODEL = "gpt-5.5";
export const DEFAULT_API_REASONING_EFFORT = "low";

export const CODEX_CLIENT_OPTIONS = {
  config: {
    sandbox_workspace_write: {
      network_access: false
    }
  }
} as const satisfies CodexOptions;

export const CODEX_THREAD_OPTIONS = {
  approvalPolicy: "never",
  networkAccessEnabled: false,
  sandboxMode: "workspace-write",
  skipGitRepoCheck: true,
  webSearchEnabled: false,
  webSearchMode: "disabled"
} as const satisfies ThreadOptions;

export type CodexEnvName = (typeof CODEX_ENV_NAMES)[number];
export type CodexAuthMode = "ambient" | "api";
export type CodexRuntimeEnv = Readonly<Record<string, string | undefined>>;

export type CodexAmbientAuth = {
  explicitAuthMode: boolean;
  mode: "ambient";
};

export type CodexApiAuth = {
  apiKey: string;
  explicitAuthMode: boolean;
  mode: "api";
  model: string;
  modelReasoningEffort: ApiReasoningEffort;
};

export type CodexAuthResolution = CodexAmbientAuth | CodexApiAuth;
export type ApiReasoningEffort = Exclude<ModelReasoningEffort, "minimal">;

const GPT_5_MODEL_PATTERN = /^gpt-5(?:$|[-.])/;
const AUTH_ERROR_PATTERN = /unauthorized|401|expired|not logged in/i;
const API_REASONING_EFFORTS = [
  "low",
  "medium",
  "high",
  "xhigh"
] as const satisfies ReadonlyArray<ApiReasoningEffort>;

export function resolveCodexAuthEnv(
  env: CodexRuntimeEnv = process.env
): CodexAuthResolution {
  const rawAuthMode = readEnv(env, CODEX_AUTH_MODE_ENV);
  const explicitAuthMode = rawAuthMode !== undefined;
  const mode = resolveAuthMode(rawAuthMode);

  if (mode === "ambient") {
    return {
      explicitAuthMode,
      mode
    };
  }

  const apiKey = readEnv(env, OPENAI_API_KEY_ENV);
  if (apiKey === undefined) {
    throw new Error(
      `${OPENAI_API_KEY_ENV} is required when ${CODEX_AUTH_MODE_ENV}=api`
    );
  }

  const model = resolveApiModel(readEnv(env, OPENAI_MODEL_ENV));
  const modelReasoningEffort = resolveApiReasoningEffort(
    readEnv(env, OPENAI_REASONING_EFFORT_ENV),
    model
  );

  return {
    apiKey,
    explicitAuthMode,
    mode,
    model,
    modelReasoningEffort
  };
}

export function resolveApiAuthFailover(
  error: unknown,
  env: CodexRuntimeEnv = process.env
): CodexApiAuth | null {
  if (readEnv(env, CODEX_AUTH_MODE_ENV) !== undefined) {
    return null;
  }

  if (
    !isAmbientAuthError(error) ||
    readEnv(env, OPENAI_API_KEY_ENV) === undefined
  ) {
    return null;
  }

  const auth = resolveCodexAuthEnv({
    CODEX_AUTH_MODE: "api",
    OPENAI_API_KEY: readEnv(env, OPENAI_API_KEY_ENV),
    OPENAI_MODEL: readEnv(env, OPENAI_MODEL_ENV),
    OPENAI_REASONING_EFFORT: readEnv(env, OPENAI_REASONING_EFFORT_ENV)
  });

  if (auth.mode !== "api") {
    throw new Error("API failover resolver returned a non-API auth mode");
  }

  return auth;
}

export function isAmbientAuthError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  return AUTH_ERROR_PATTERN.test(message);
}

export function resolveApiModel(rawModel?: string) {
  const model = rawModel ?? DEFAULT_API_MODEL;

  if (!GPT_5_MODEL_PATTERN.test(model)) {
    throw new Error(`${OPENAI_MODEL_ENV} must be a GPT-5-family model`);
  }

  if (model.toLowerCase().includes("nano")) {
    throw new Error(`${OPENAI_MODEL_ENV} must not use nano variants`);
  }

  return model;
}

export function resolveApiReasoningEffort(
  rawEffort: string | undefined,
  model: string
): ApiReasoningEffort {
  const effort = rawEffort ?? DEFAULT_API_REASONING_EFFORT;

  if (effort === "minimal") {
    throw new Error(
      `${OPENAI_REASONING_EFFORT_ENV}=minimal is not supported for ${model}`
    );
  }

  if (!isApiReasoningEffort(effort)) {
    throw new Error(
      `${OPENAI_REASONING_EFFORT_ENV} must be low, medium, high, or xhigh`
    );
  }

  return effort;
}

export function buildCodexClientOptions(
  auth: CodexAuthResolution
): CodexOptions {
  if (auth.mode === "ambient") {
    return CODEX_CLIENT_OPTIONS;
  }

  return {
    ...CODEX_CLIENT_OPTIONS,
    apiKey: auth.apiKey
  };
}

export function buildCodexThreadOptions(
  auth: CodexAuthResolution,
  workingDirectory?: string
): ThreadOptions {
  return {
    ...CODEX_THREAD_OPTIONS,
    ...(workingDirectory ? { workingDirectory } : {}),
    ...(auth.mode === "api"
      ? {
          model: auth.model,
          modelReasoningEffort: auth.modelReasoningEffort
        }
      : {})
  };
}

export type CreateCodexRuntimeOptions = {
  env?: CodexRuntimeEnv;
  workingDirectory?: string;
};

export function createCodexRuntime(options: CreateCodexRuntimeOptions = {}) {
  const auth = resolveCodexAuthEnv(options.env);

  return {
    auth,
    client: new Codex(buildCodexClientOptions(auth)),
    threadOptions: buildCodexThreadOptions(auth, options.workingDirectory),
    turnTimeoutMs: CODEX_TURN_TIMEOUT_MS
  };
}

function resolveAuthMode(rawAuthMode: string | undefined): CodexAuthMode {
  if (rawAuthMode === undefined || rawAuthMode === "ambient") {
    return "ambient";
  }

  if (rawAuthMode === "api") {
    return "api";
  }

  throw new Error(`${CODEX_AUTH_MODE_ENV} must be either ambient or api`);
}

function readEnv(env: CodexRuntimeEnv, name: CodexEnvName) {
  const value = env[name]?.trim();

  return value === "" ? undefined : value;
}

function isApiReasoningEffort(value: string): value is ApiReasoningEffort {
  return API_REASONING_EFFORTS.includes(value as ApiReasoningEffort);
}
