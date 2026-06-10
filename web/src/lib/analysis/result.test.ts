import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  analysisCommandEntrySchema,
  analysisCapturedFieldsSchema,
  analysisChartPayloadSchema,
  analysisChartSchema,
  analysisEngineResultSchema,
  analysisModelResultSchema,
  analysisRuntimeMetadataSchema,
  analysisTableSchema
} from "./result";

describe("analysis result contract", () => {
  it("accepts the Phase 2 model-emitted result shape", () => {
    expect(
      analysisModelResultSchema.parse({
        answer: "West was the top region in May 2026.",
        chart: {
          data: [{ label: "West", value: 236640 }],
          type: "bar"
        },
        notes: ["Computed from paid orders."],
        table: {
          columns: ["Region", "Revenue"],
          rows: [["West", 236640]]
        }
      })
    ).toEqual({
      answer: "West was the top region in May 2026.",
      chart: {
        data: [{ label: "West", value: 236640 }],
        type: "bar"
      },
      notes: ["Computed from paid orders."],
      table: {
        columns: ["Region", "Revenue"],
        rows: [["West", 236640]]
      }
    });
  });

  it("rejects unexpected top-level model-emitted keys", () => {
    expect(() =>
      analysisModelResultSchema.parse({
        answer: "West was the top region in May 2026.",
        generatedCode: "const leaked = true;"
      })
    ).toThrow();
  });

  it("supports bar, line, and pie chart variants", () => {
    for (const type of ["bar", "line", "pie"] as const) {
      expect(
        analysisChartSchema.parse({
          data: [{ label: "West", value: 236640 }],
          type
        }).type
      ).toBe(type);
    }
  });

  it("supports app-captured chart display units", () => {
    for (const unit of ["currency_cents", "number"] as const) {
      expect(
        analysisChartPayloadSchema.parse({
          data: [{ label: "West", value: 236640 }],
          title: "Analysis chart",
          type: "bar",
          unit,
          xLabel: "Region",
          yLabel: "Revenue"
        }).unit
      ).toBe(unit);
    }

    expect(() =>
      analysisChartPayloadSchema.parse({
        data: [{ label: "West", value: 236640 }],
        title: "Analysis chart",
        type: "bar",
        unit: "currency_dollars",
        xLabel: "Region",
        yLabel: "Revenue"
      })
    ).toThrow();
  });

  it("rejects unexpected nested chart and table keys", () => {
    expect(() =>
      analysisChartSchema.parse({
        data: [{ label: "West", value: 236640, color: "blue" }],
        type: "bar"
      })
    ).toThrow();

    expect(() =>
      analysisTableSchema.parse({
        columns: ["Region", "Revenue"],
        rows: [["West", 236640]],
        title: "May revenue"
      })
    ).toThrow();
  });

  it("keeps app-captured fields separate from model-emitted fields", () => {
    expect(
      analysisCapturedFieldsSchema.parse({
        attempts: 1,
        commandLog: [
          {
            command: "node analysis.mjs",
            exitCode: 0,
            output: "Wrote result.json",
            status: "completed"
          }
        ],
        durationMs: 250,
        fallback: false,
        generatedCode: "console.log('analysis');"
      })
    ).toEqual({
      attempts: 1,
      commandLog: [
        {
          command: "node analysis.mjs",
          exitCode: 0,
          output: "Wrote result.json",
          status: "completed"
        }
      ],
      durationMs: 250,
      fallback: false,
      generatedCode: "console.log('analysis');"
    });

    expect(() =>
      analysisCapturedFieldsSchema.parse({
        answer: "Model output belongs in result.json.",
        attempts: 1,
        commandLog: [
          {
            command: "node analysis.mjs",
            output: "Wrote result.json",
            status: "completed"
          }
        ],
        durationMs: 250,
        fallback: false,
        generatedCode: "console.log('analysis');"
      })
    ).toThrow();
  });

  it("requires structured command-log entries for captured fields", () => {
    expect(() =>
      analysisCapturedFieldsSchema.parse({
        attempts: 1,
        commandLog: "node analysis.mjs",
        durationMs: 250,
        fallback: false,
        generatedCode: "console.log('analysis');"
      })
    ).toThrow();

    expect(
      analysisCapturedFieldsSchema.parse({
        attempts: 1,
        commandLog: [
          {
            command: "node analysis.mjs",
            output: "Running analysis",
            status: "in_progress"
          },
          {
            command: "node analysis.mjs",
            exitCode: 1,
            output: "Error: missing result.json",
            status: "failed"
          }
        ],
        durationMs: 250,
        fallback: true,
        generatedCode: "console.log('analysis');"
      }).commandLog
    ).toEqual([
      {
        command: "node analysis.mjs",
        output: "Running analysis",
        status: "in_progress"
      },
      {
        command: "node analysis.mjs",
        exitCode: 1,
        output: "Error: missing result.json",
        status: "failed"
      }
    ]);
  });

  it("exports a strict engine result type for persistence handoff", () => {
    expect(
      analysisEngineResultSchema.parse({
        answer: "West was the top region in May 2026.",
        attempts: 1,
        chart: {
          data: [{ label: "West", value: 236640 }],
          type: "bar"
        },
        commandLog: [
          {
            command: "node analysis.mjs",
            exitCode: 0,
            output: "Wrote result.json",
            status: "completed"
          }
        ],
        durationMs: 250,
        fallback: false,
        generatedCode: "console.log('analysis');"
      })
    ).toEqual({
      answer: "West was the top region in May 2026.",
      attempts: 1,
      chart: {
        data: [{ label: "West", value: 236640 }],
        type: "bar"
      },
      commandLog: [
        {
          command: "node analysis.mjs",
          exitCode: 0,
          output: "Wrote result.json",
          status: "completed"
        }
      ],
      durationMs: 250,
      fallback: false,
      generatedCode: "console.log('analysis');"
    });
  });

  it("rejects string command logs for engine results", () => {
    expect(() =>
      analysisEngineResultSchema.parse({
        answer: "West was the top region in May 2026.",
        attempts: 1,
        commandLog: "node analysis.mjs",
        durationMs: 250,
        fallback: false,
        generatedCode: "console.log('analysis');"
      })
    ).toThrow();
  });

  it("keeps deterministic and engine runtime metadata distinct", () => {
    expect(
      analysisRuntimeMetadataSchema.parse({
        completedAt: "2026-06-10T12:00:00.000Z",
        durationMs: 0,
        matchedKnownAnswer: true,
        mode: "deterministic-stub"
      })
    ).toEqual({
      completedAt: "2026-06-10T12:00:00.000Z",
      durationMs: 0,
      matchedKnownAnswer: true,
      mode: "deterministic-stub"
    });

    expect(
      analysisRuntimeMetadataSchema.parse({
        attempts: 1,
        completedAt: "2026-06-10T12:00:00.000Z",
        durationMs: 250,
        fallback: false,
        mode: "codex-engine"
      })
    ).toEqual({
      attempts: 1,
      completedAt: "2026-06-10T12:00:00.000Z",
      durationMs: 250,
      fallback: false,
      mode: "codex-engine"
    });
  });

  it("preserves strict JSON-schema invariants", () => {
    const modelJsonSchema = asJsonObject(
      z.toJSONSchema(analysisModelResultSchema)
    );
    const capturedJsonSchema = asJsonObject(
      z.toJSONSchema(analysisCapturedFieldsSchema)
    );
    const chartPayloadJsonSchema = asJsonObject(
      z.toJSONSchema(analysisChartPayloadSchema)
    );
    const commandEntryJsonSchema = asJsonObject(
      z.toJSONSchema(analysisCommandEntrySchema)
    );
    const modelProperties = asJsonObject(modelJsonSchema.properties);
    const chartJsonSchema = asJsonObject(modelProperties.chart);
    const chartProperties = asJsonObject(chartJsonSchema.properties);
    const chartDataSchema = asJsonObject(chartProperties.data);
    const chartDataItemSchema = asJsonObject(chartDataSchema.items);
    const tableJsonSchema = asJsonObject(modelProperties.table);
    const chartPayloadProperties = asJsonObject(
      chartPayloadJsonSchema.properties
    );
    const chartPayloadUnitSchema = asJsonObject(chartPayloadProperties.unit);

    expect(modelJsonSchema).toMatchObject({
      additionalProperties: false,
      required: ["answer"],
      type: "object"
    });
    expect(chartJsonSchema).toMatchObject({
      additionalProperties: false,
      required: ["data", "type"],
      type: "object"
    });
    expect(tableJsonSchema).toMatchObject({
      additionalProperties: false,
      required: ["columns", "rows"],
      type: "object"
    });
    expect(chartDataItemSchema).toMatchObject({
      additionalProperties: false,
      required: ["label", "value"],
      type: "object"
    });

    expect(capturedJsonSchema).toMatchObject({
      additionalProperties: false,
      required: [
        "attempts",
        "commandLog",
        "durationMs",
        "fallback",
        "generatedCode"
      ],
      type: "object"
    });

    expect(commandEntryJsonSchema).toMatchObject({
      additionalProperties: false,
      required: ["command", "output", "status"],
      type: "object"
    });

    expect(chartPayloadJsonSchema).toMatchObject({
      additionalProperties: false,
      required: ["data", "type", "title", "unit", "xLabel", "yLabel"],
      type: "object"
    });
    expect(chartPayloadUnitSchema).toMatchObject({
      enum: ["currency_cents", "number"],
      type: "string"
    });
  });
});

type JsonObject = Record<string, unknown>;

function asJsonObject(value: unknown): JsonObject {
  expect(value).toBeTypeOf("object");
  expect(value).not.toBeNull();

  return value as JsonObject;
}
