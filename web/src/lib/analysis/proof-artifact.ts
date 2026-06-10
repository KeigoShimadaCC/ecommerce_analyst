import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { AuthenticatedSession } from "../auth";
import {
  createMerchantSnapshot,
  type SnapshotFileName
} from "../codex/snapshot";
import {
  getAnalysisRunByIdForSession,
  type AnalysisDatabase
} from "./runs";
import type {
  AnalysisAnswerPayload,
  AnalysisChartPayload,
  AnalysisRuntimeMetadata
} from "./result";

export type AnalysisProofArtifact = {
  analysisId: string;
  question: string;
  answer: AnalysisAnswerPayload;
  chart: AnalysisChartPayload;
  generatedCode: string;
  commandLog: string;
  runtimeMetadata: AnalysisRuntimeMetadata;
  attempts: number;
  fallback: boolean;
  generatedAt: string;
  dataSnapshot: {
    metadata: {
      merchantId: string;
      regeneratedAt: string;
      source: "download_time_regeneration";
      note: string;
    };
    manifest: Array<{
      byteLength: number;
      fileName: SnapshotFileName;
      lineCount: number;
      sha256: string;
    }>;
    contents: Record<SnapshotFileName, string>;
  };
};

type BuildAnalysisProofArtifactOptions = {
  generatedAt?: Date;
  tempRoot?: string;
};

export async function buildAnalysisProofArtifactForSession(
  database: AnalysisDatabase,
  session: Pick<AuthenticatedSession, "merchantId">,
  analysisId: string,
  options: BuildAnalysisProofArtifactOptions = {}
): Promise<AnalysisProofArtifact | null> {
  const run = getAnalysisRunByIdForSession(database, session, analysisId);

  if (!run) {
    return null;
  }

  const generatedAt = (options.generatedAt ?? new Date()).toISOString();
  const snapshot = await createMerchantSnapshot({
    database,
    merchantId: session.merchantId,
    tempRoot: options.tempRoot
  });

  try {
    const contents = await readSnapshotContents(snapshot.files);

    return {
      analysisId: run.id,
      answer: run.answer,
      attempts: run.attempts,
      chart: run.chart,
      commandLog: run.commandLog,
      dataSnapshot: {
        contents,
        manifest: buildSnapshotManifest(contents),
        metadata: {
          merchantId: session.merchantId,
          note:
            "Snapshot files were regenerated at proof-download time from the current authenticated merchant database rows; this is not the original runtime SDK temporary directory.",
          regeneratedAt: generatedAt,
          source: "download_time_regeneration"
        }
      },
      fallback: run.fallback,
      generatedAt,
      generatedCode: run.generatedCode,
      question: run.question,
      runtimeMetadata: run.runtimeMetadata
    };
  } finally {
    await snapshot.cleanup();
  }
}

async function readSnapshotContents(
  files: Record<SnapshotFileName, string>
): Promise<Record<SnapshotFileName, string>> {
  const entries = await Promise.all(
    Object.entries(files).map(async ([fileName, filePath]) => [
      fileName,
      await readFile(filePath, "utf8")
    ])
  );

  return Object.fromEntries(entries) as Record<SnapshotFileName, string>;
}

function buildSnapshotManifest(contents: Record<SnapshotFileName, string>) {
  return Object.entries(contents).map(([fileName, content]) => ({
    byteLength: Buffer.byteLength(content, "utf8"),
    fileName: fileName as SnapshotFileName,
    lineCount: content.split("\n").length - 1,
    sha256: createHash("sha256").update(content).digest("hex")
  }));
}
