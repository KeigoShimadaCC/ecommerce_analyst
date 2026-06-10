import { z } from "zod";

export const analysisTableCellSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null()
]);

export const analysisTableSchema = z
  .object({
    columns: z.array(z.string()),
    rows: z.array(z.array(analysisTableCellSchema))
  })
  .strict();

export const analysisChartPointSchema = z
  .object({
    label: z.string(),
    value: z.number()
  })
  .strict();

export const analysisChartSchema = z
  .object({
    data: z.array(analysisChartPointSchema),
    type: z.enum(["bar", "line", "pie"])
  })
  .strict();

export const analysisModelResultSchema = z
  .object({
    answer: z.string(),
    chart: analysisChartSchema.optional(),
    notes: z.array(z.string()).optional(),
    table: analysisTableSchema.optional()
  })
  .strict();

export const analysisCommandEntrySchema = z
  .object({
    command: z.string(),
    exitCode: z.number().int().optional(),
    output: z.string(),
    status: z.enum(["completed", "failed", "in_progress"])
  })
  .strict();

export const analysisCapturedFieldsSchema = z
  .object({
    attempts: z.number().int().nonnegative(),
    commandLog: z.array(analysisCommandEntrySchema),
    durationMs: z.number().nonnegative(),
    fallback: z.boolean(),
    generatedCode: z.string()
  })
  .strict();

export const analysisEngineResultSchema = analysisModelResultSchema
  .extend(analysisCapturedFieldsSchema.shape)
  .strict();

export type AnalysisTableCell = z.infer<typeof analysisTableCellSchema>;
export type AnalysisTablePayload = z.infer<typeof analysisTableSchema>;
export type AnalysisModelChartPayload = z.infer<typeof analysisChartSchema>;
export type AnalysisModelResult = z.infer<typeof analysisModelResultSchema>;
export type AnalysisCommandEntry = z.infer<typeof analysisCommandEntrySchema>;
export type AnalysisCapturedFields = z.infer<
  typeof analysisCapturedFieldsSchema
>;
export type AnalysisEngineResult = z.infer<typeof analysisEngineResultSchema>;

export const analysisAnswerPayloadSchema = z
  .object({
    answer: z.string(),
    fallback: z.boolean(),
    highlights: z.array(
      z
        .object({
          label: z.string(),
          value: z.string()
        })
        .strict()
    ),
    notes: z.array(z.string()),
    recommendation: z.string()
  })
  .strict();

export const analysisChartPayloadSchema = analysisChartSchema
  .extend({
    title: z.string(),
    unit: z.enum(["currency_cents", "number"]),
    xLabel: z.string(),
    yLabel: z.string()
  })
  .strict();

export const deterministicRuntimeMetadataSchema = z
  .object({
    completedAt: z.string(),
    durationMs: z.number().nonnegative(),
    matchedKnownAnswer: z.boolean(),
    mode: z.literal("deterministic-stub")
  })
  .strict();

export const codexEngineRuntimeMetadataSchema = z
  .object({
    attempts: z.number().int().nonnegative(),
    completedAt: z.string(),
    durationMs: z.number().nonnegative(),
    fallback: z.boolean(),
    mode: z.literal("codex-engine")
  })
  .strict();

export const analysisRuntimeMetadataSchema = z.union([
  deterministicRuntimeMetadataSchema,
  codexEngineRuntimeMetadataSchema
]);

export type AnalysisAnswerPayload = z.infer<
  typeof analysisAnswerPayloadSchema
>;
export type AnalysisChartPayload = z.infer<typeof analysisChartPayloadSchema>;
export type AnalysisRuntimeMetadata = z.infer<
  typeof analysisRuntimeMetadataSchema
>;

export type AnalysisRunResult = {
  answer: AnalysisAnswerPayload;
  attempts: number;
  chart: AnalysisChartPayload;
  commandLog: string;
  completedAt: Date | null;
  createdAt: Date;
  fallback: boolean;
  generatedCode: string;
  id: string;
  merchantId: string;
  question: string;
  runtimeMetadata: AnalysisRuntimeMetadata;
  updatedAt: Date;
  userId: string | null;
};

export type AnalysisRunSummary = Pick<
  AnalysisRunResult,
  | "answer"
  | "completedAt"
  | "createdAt"
  | "fallback"
  | "id"
  | "question"
  | "updatedAt"
>;

export function validateModelResult(value: unknown): AnalysisModelResult {
  return analysisModelResultSchema.parse(value);
}

export function validateCapturedFields(value: unknown): AnalysisCapturedFields {
  return analysisCapturedFieldsSchema.parse(value);
}

export function validateEngineResult(value: unknown): AnalysisEngineResult {
  return analysisEngineResultSchema.parse(value);
}

export function validateAnswerPayload(value: unknown): AnalysisAnswerPayload {
  return analysisAnswerPayloadSchema.parse(value);
}

export function validateChartPayload(value: unknown): AnalysisChartPayload {
  return analysisChartPayloadSchema.parse(value);
}

export function validateRuntimeMetadata(
  value: unknown
): AnalysisRuntimeMetadata {
  return analysisRuntimeMetadataSchema.parse(value);
}
