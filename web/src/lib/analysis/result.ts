export type AnalysisAnswerPayload = {
  answer: string;
  fallback: boolean;
  highlights: Array<{
    label: string;
    value: string;
  }>;
  notes: string[];
  recommendation: string;
};

export type AnalysisChartPayload = {
  data: Array<{
    label: string;
    value: number;
  }>;
  title: string;
  type: "bar";
  unit: "currency_cents";
  xLabel: string;
  yLabel: string;
};

export type AnalysisRuntimeMetadata = {
  completedAt: string;
  durationMs: number;
  matchedKnownAnswer: boolean;
  mode: "deterministic-stub";
};

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

export function validateAnswerPayload(value: unknown): AnalysisAnswerPayload {
  if (!isRecord(value)) {
    throw new Error("Analysis answer payload must be an object.");
  }

  if (
    typeof value.answer !== "string" ||
    typeof value.fallback !== "boolean" ||
    typeof value.recommendation !== "string" ||
    !Array.isArray(value.highlights) ||
    !Array.isArray(value.notes)
  ) {
    throw new Error("Analysis answer payload has an invalid shape.");
  }

  return {
    answer: value.answer,
    fallback: value.fallback,
    highlights: value.highlights.map(validateHighlight),
    notes: value.notes.map(validateString),
    recommendation: value.recommendation
  };
}

export function validateChartPayload(value: unknown): AnalysisChartPayload {
  if (!isRecord(value)) {
    throw new Error("Analysis chart payload must be an object.");
  }

  if (
    value.type !== "bar" ||
    value.unit !== "currency_cents" ||
    typeof value.title !== "string" ||
    typeof value.xLabel !== "string" ||
    typeof value.yLabel !== "string" ||
    !Array.isArray(value.data)
  ) {
    throw new Error("Analysis chart payload has an invalid shape.");
  }

  return {
    data: value.data.map(validateChartPoint),
    title: value.title,
    type: "bar",
    unit: "currency_cents",
    xLabel: value.xLabel,
    yLabel: value.yLabel
  };
}

export function validateRuntimeMetadata(
  value: unknown
): AnalysisRuntimeMetadata {
  if (!isRecord(value)) {
    throw new Error("Analysis runtime metadata must be an object.");
  }

  if (
    value.mode !== "deterministic-stub" ||
    typeof value.completedAt !== "string" ||
    typeof value.durationMs !== "number" ||
    typeof value.matchedKnownAnswer !== "boolean"
  ) {
    throw new Error("Analysis runtime metadata has an invalid shape.");
  }

  return {
    completedAt: value.completedAt,
    durationMs: value.durationMs,
    matchedKnownAnswer: value.matchedKnownAnswer,
    mode: "deterministic-stub"
  };
}

function validateHighlight(value: unknown) {
  if (
    !isRecord(value) ||
    typeof value.label !== "string" ||
    typeof value.value !== "string"
  ) {
    throw new Error("Analysis highlight has an invalid shape.");
  }

  return {
    label: value.label,
    value: value.value
  };
}

function validateChartPoint(value: unknown) {
  if (
    !isRecord(value) ||
    typeof value.label !== "string" ||
    typeof value.value !== "number"
  ) {
    throw new Error("Analysis chart point has an invalid shape.");
  }

  return {
    label: value.label,
    value: value.value
  };
}

function validateString(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("Analysis note must be a string.");
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
