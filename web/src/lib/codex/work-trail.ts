import { access, readFile, readdir } from "node:fs/promises";
import { basename, isAbsolute, join } from "node:path";
import type {
  CommandExecutionItem,
  FileChangeItem,
  ThreadItem
} from "@openai/codex-sdk";
import type { AnalysisCommandEntry } from "../analysis/result";

export type WorkTrailTurn = {
  items: ReadonlyArray<ThreadItem>;
};

export type CaptureWorkTrailOptions = {
  snapshotDirectory: string;
  turns: ReadonlyArray<WorkTrailTurn>;
};

export type CapturedWorkTrail = {
  commandLog: AnalysisCommandEntry[];
  generatedCode: string;
};

const ANALYSIS_SCRIPT_NAMES = new Set(["analysis.mjs", "analysis.py"]);

export async function captureWorkTrail({
  snapshotDirectory,
  turns
}: CaptureWorkTrailOptions): Promise<CapturedWorkTrail> {
  const commandLog: AnalysisCommandEntry[] = [];
  const candidatePaths = new Map<string, string>();

  for (const turn of turns) {
    for (const item of turn.items) {
      if (isCommandExecutionItem(item)) {
        commandLog.push({
          command: item.command,
          ...(item.exit_code === undefined ? {} : { exitCode: item.exit_code }),
          output: item.aggregated_output,
          status: item.status
        });
      }

      if (isFileChangeItem(item)) {
        for (const change of item.changes) {
          const resolvedPath = resolveAnalysisScriptPath(
            snapshotDirectory,
            change.path
          );
          if (resolvedPath) {
            candidatePaths.set(resolvedPath, resolvedPath);
          }
        }
      }
    }
  }

  for (const scannedPath of await scanSnapshotAnalysisScripts(
    snapshotDirectory
  )) {
    candidatePaths.set(scannedPath, scannedPath);
  }

  return {
    commandLog,
    generatedCode: await readGeneratedCode([...candidatePaths.values()])
  };
}

function isCommandExecutionItem(item: ThreadItem): item is CommandExecutionItem {
  return item.type === "command_execution";
}

function isFileChangeItem(item: ThreadItem): item is FileChangeItem {
  return item.type === "file_change";
}

function resolveAnalysisScriptPath(
  snapshotDirectory: string,
  changedPath: string
) {
  if (!ANALYSIS_SCRIPT_NAMES.has(basename(changedPath))) {
    return null;
  }

  return isAbsolute(changedPath) ? changedPath : join(snapshotDirectory, changedPath);
}

async function scanSnapshotAnalysisScripts(snapshotDirectory: string) {
  let entries: string[];

  try {
    entries = await readdir(snapshotDirectory);
  } catch (error) {
    console.error("Failed to scan snapshot directory for analysis scripts", {
      error,
      snapshotDirectory
    });
    return [];
  }

  return entries
    .filter((entry) => ANALYSIS_SCRIPT_NAMES.has(entry))
    .sort()
    .map((entry) => join(snapshotDirectory, entry));
}

async function readGeneratedCode(paths: string[]) {
  const sections: string[] = [];

  for (const path of paths) {
    try {
      await access(path);
      const code = await readFile(path, "utf8");
      sections.push(`# File: ${basename(path)}\n${code.trimEnd()}`);
    } catch (error) {
      console.error("Failed to read generated analysis script", {
        error,
        path
      });
    }
  }

  return sections.join("\n\n");
}
