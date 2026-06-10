import { describe, expect, it } from "vitest";
import {
  buildCodexClientOptions,
  buildCodexThreadOptions,
  CODEX_CLIENT_OPTIONS,
  CODEX_ENV_NAMES,
  CODEX_THREAD_OPTIONS,
  CODEX_TURN_TIMEOUT_MS,
  isAmbientAuthError,
  resolveApiAuthFailover,
  resolveApiModel,
  resolveApiReasoningEffort,
  resolveCodexAuthEnv
} from "./client";

describe("codex client env resolver", () => {
  it("documents the frozen env names", () => {
    expect(CODEX_ENV_NAMES).toEqual([
      "CODEX_AUTH_MODE",
      "OPENAI_API_KEY",
      "OPENAI_MODEL",
      "OPENAI_REASONING_EFFORT"
    ]);
  });

  it("defaults to ambient auth without model or reasoning options", () => {
    const auth = resolveCodexAuthEnv({});
    const threadOptions = buildCodexThreadOptions(auth, "/tmp/snapshot");

    expect(auth).toEqual({
      explicitAuthMode: false,
      mode: "ambient"
    });
    expect(buildCodexClientOptions(auth)).toEqual(CODEX_CLIENT_OPTIONS);
    expect(threadOptions).toMatchObject({
      ...CODEX_THREAD_OPTIONS,
      workingDirectory: "/tmp/snapshot"
    });
    expect(threadOptions).not.toHaveProperty("model");
    expect(threadOptions).not.toHaveProperty("modelReasoningEffort");
  });

  it("resolves explicit API auth with valid gpt-5.5 and low reasoning", () => {
    const auth = resolveCodexAuthEnv({
      CODEX_AUTH_MODE: "api",
      OPENAI_API_KEY: "sk-test",
      OPENAI_MODEL: "gpt-5.5",
      OPENAI_REASONING_EFFORT: "low"
    });

    expect(auth).toEqual({
      apiKey: "sk-test",
      explicitAuthMode: true,
      mode: "api",
      model: "gpt-5.5",
      modelReasoningEffort: "low"
    });
    expect(buildCodexClientOptions(auth)).toEqual({
      ...CODEX_CLIENT_OPTIONS,
      apiKey: "sk-test"
    });
    expect(buildCodexThreadOptions(auth)).toMatchObject({
      ...CODEX_THREAD_OPTIONS,
      model: "gpt-5.5",
      modelReasoningEffort: "low"
    });
  });

  it("defaults API model and reasoning effort explicitly", () => {
    const auth = resolveCodexAuthEnv({
      CODEX_AUTH_MODE: "api",
      OPENAI_API_KEY: "sk-test"
    });

    expect(auth).toMatchObject({
      mode: "api",
      model: "gpt-5.5",
      modelReasoningEffort: "low"
    });
  });

  it("rejects non-GPT-5 API models", () => {
    expect(() => resolveApiModel("gpt-4o")).toThrow(
      "OPENAI_MODEL must be a GPT-5-family model"
    );
    expect(() =>
      resolveCodexAuthEnv({
        CODEX_AUTH_MODE: "api",
        OPENAI_API_KEY: "sk-test",
        OPENAI_MODEL: "o4-mini"
      })
    ).toThrow("OPENAI_MODEL must be a GPT-5-family model");
  });

  it("rejects nano API models", () => {
    expect(() => resolveApiModel("gpt-5-nano")).toThrow(
      "OPENAI_MODEL must not use nano variants"
    );
    expect(() => resolveApiModel("gpt-5.4-nano")).toThrow(
      "OPENAI_MODEL must not use nano variants"
    );
  });

  it("rejects invalid API reasoning effort and minimal", () => {
    expect(() => resolveApiReasoningEffort("fast", "gpt-5.5")).toThrow(
      "OPENAI_REASONING_EFFORT must be low, medium, high, or xhigh"
    );
    expect(() => resolveApiReasoningEffort("minimal", "gpt-5.5")).toThrow(
      "OPENAI_REASONING_EFFORT=minimal is not supported for gpt-5.5"
    );
  });

  it("exposes runtime safety options for the engine", () => {
    expect(CODEX_CLIENT_OPTIONS).toEqual({
      config: {
        sandbox_workspace_write: {
          network_access: false
        }
      }
    });
    expect(CODEX_THREAD_OPTIONS).toEqual({
      approvalPolicy: "never",
      networkAccessEnabled: false,
      sandboxMode: "workspace-write",
      skipGitRepoCheck: true,
      webSearchEnabled: false,
      webSearchMode: "disabled"
    });
    expect(CODEX_TURN_TIMEOUT_MS).toBe(120_000);
  });

  it("represents ambient auth failover only after matching auth errors", () => {
    const env = {
      OPENAI_API_KEY: "sk-test",
      OPENAI_MODEL: "gpt-5.5",
      OPENAI_REASONING_EFFORT: "low"
    };

    expect(isAmbientAuthError(new Error("not logged in"))).toBe(true);
    expect(resolveApiAuthFailover(new Error("401 unauthorized"), env)).toEqual({
      apiKey: "sk-test",
      explicitAuthMode: true,
      mode: "api",
      model: "gpt-5.5",
      modelReasoningEffort: "low"
    });
    expect(resolveApiAuthFailover(new Error("network failed"), env)).toBeNull();
    expect(
      resolveApiAuthFailover(new Error("not logged in"), {
        ...env,
        CODEX_AUTH_MODE: "ambient"
      })
    ).toBeNull();
  });
});
