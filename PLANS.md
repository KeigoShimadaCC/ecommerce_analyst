# Planning Methodology — Phase Plans & Atomic Tasks

This document is the canonical authority for HOW work is planned in this repository. It adapts OpenAI's published ExecPlan pattern ("Using PLANS.md for multi-hour problem solving", https://developers.openai.com/cookbook/articles/codex_exec_plans, Aaron Friel, 2025) for our orchestrator-subagent workflow.

The canonical pattern targets a single long-running Codex thread that writes and self-iterates against its own plan. Ours differs in execution model only: we split planning, decomposition, and execution across **four tiers** (defined in Section 1). The top tier supervises, the next authors plans, the middle tier decomposes a phase into atomic tasks and dispatches them, and the bottom tier executes one task per worker brief; each tier reviews the tier below at a gate. We borrow the canonical's structure (self-containment, mandatory living-document sections, the phase-plan skeleton) wholesale, and change who executes.

Read `AGENTS.md` for operational rules (commands, sandbox, conventions, do-not rules) and `NORTH_STAR.md` for product vision and milestones. This file is structural, not operational — it defines what a plan looks like, not what to build. Where a rule is operational, it lives in AGENTS.md and is cross-referenced here, never duplicated.

## 1. Definitions

- **Phase**: a coherent unit of work bounded by a phase tag (`phase-NN-complete`), corresponding to one `NORTH_STAR.md` milestone. Written as `phase-plans/phase-NN-<name>.md`.
- **Atomic task**: a self-contained brief that a single Codex subagent can execute end-to-end as one worker assignment, with a clear goal, frozen contracts, owned files, an explicit definition of done, and a time budget (typically 5–30 minutes of Codex wall-clock).
### Execution tiers (who does what)

Work is split across four tiers. Each tier dispatches the tier below, reviews its distilled output at a gate, and surfaces blockers to the tier above. None of them hand-writes implementation code (see AGENTS.md); only the bottom tier writes app files.

- **Human supervisor (Tier 0)** — the person who sets up accounts, launches the Codex Lead, watches for drift, makes checkpoint cut-to-MVP decisions, does the visual browser smoke, records the demo video, and gives final sign-off. The supervisor does not write code, briefs, or commits — that is the Lead's job. The supervisor intervenes only at the meta level: kill/redirect a drifting Lead, answer BLOCKED escalations, approve scope cuts. See `RUNBOOK.md` for the full choreography.
- **Project Lead (Tier 1)** — a **Codex** session, run **unsandboxed** (`danger-full-access`) so it can write `.git` (the Codex sandbox blocks all git history operations — see AGENTS.md Environment facts). The Lead is booted by the supervisor with a concrete kickoff prompt (local-only, not in the repo). The Lead owns: product/architecture judgment, the off-clock pre-build, NORTH_STAR.md / AGENTS.md / PLANS.md (Lead-owned docs), ALL git history (commit, tag, push), the final vendor scan, the visual browser smoke (via Playwright MCP or surfacing to the supervisor), the final live SDK turn, and all BLOCKED escalations to the supervisor. The Lead spawns one phase orchestrator per phase and reviews its handoff at the phase gate. The Lead never decomposes individual atomic tasks itself — that is the phase orchestrator's job.
- **Phase orchestrator (Tier 2)** — one **sandboxed** Codex session per phase, spawned by the Lead through `scripts/codex-run.sh`. Reads AGENTS.md + PLANS.md + its `phase-plans/<n>.md`, freezes the phase contract, decomposes the phase into atomic tasks, dispatches subtask workers as in-session sub-agents, runs the programmatic gates (typecheck, lint, test, build), and records the intended atomic-commit breakdown + deviations in the phase report. Tier 2 never attempts a live runtime-SDK turn; that proof is Lead-owned at the review gate. Cannot write `.git`. Hands the Lead: gate results, the commit breakdown, deviations, and any BLOCKED escalation.
- **Subtask worker (Tier 3)** — a **sandboxed** in-session sub-agent executing exactly ONE atomic task inside the orchestrator's session, never as a nested harness launch. Each worker still receives a self-contained written brief and returns a distilled handoff. Writes only its owned files, runs the task's local gates, leaves the working tree staged-of-nothing, and records its evidence + intended commit message. Cannot write `.git`. Hands the orchestrator: the diff summary, gate output, and any BLOCKED escalation.

Throughout this document, **"orchestrator" unqualified means the phase orchestrator (Tier 2)** — the tier that performs decomposition. Where a step is Lead-only (git, visual smoke, final SDK turn), it is called out explicitly. Where a step is supervisor-only (visual smoke sign-off, video, final acceptance), it is called out as well.

Build-time model and reasoning effort are role-scoped in `AGENTS.md`: Lead judgment uses the highest effort, phase orchestrators use high effort by default, and workers use medium unless a task-specific exception is recorded. Phase plans and worker briefs consume that policy; they do not redefine it.

The four tiers are driven by kickoff prompts forming a chain: the supervisor boots the Lead with a local-only concrete prompt; the Lead fills `prompts/phase-orchestrator.md` per phase and launches it via `scripts/codex-run.sh`; the phase orchestrator fills `prompts/subtask-worker.md` per atomic task and dispatches it as an in-session sub-agent. See `AGENTS.md` Prompt library for the full table.

Every phase-orchestrator template carries verbatim: "You write no application code yourself. Every code change, however small, is dispatched to a subtask worker with a written brief. Your own writes are limited to orchestration artifacts: the phase report, the filled worker briefs, and your phase plan's living sections."

### Prompt fidelity

The launch prompt for a session is part of that session's plan contract. Every tier must stay faithful to the prompt it actually received.

- Before starting work, restate the launch prompt's role, scope, owned files, forbidden files, and definition of done in the private plan, task plan, or phase report.
- During long work, re-check the launch prompt before making scope, architecture, file-ownership, model/effort, or gate decisions.
- At handoff, report any deviation from the launch prompt explicitly, including why it happened and whether it implies a docs update.
- If a launch prompt conflicts with `NORTH_STAR.md`, `AGENTS.md`, this file, or the active phase plan, stop and escalate BLOCKED to the parent tier. Do not silently choose one.
- Do not rely on memory of a parent-tier prompt the session did not receive. A worker follows its own launch prompt plus tracked docs available in its working tree.

### Cross-tier handoff & BLOCKED escalation

- **Handoff is distilled, not raw.** Each tier returns to the tier above a summary it can act on — gate verdicts, a commit breakdown, a deviation list, file:line citations — never a request to re-read the full working tree. The reviewing tier accepts via the phase report and gate logs, not by re-doing the work.
- **BLOCKED protocol.** When a tier hits something its inputs do not resolve — a frozen-contract conflict, a needed file outside the owned list, an environment fact contradicting AGENTS.md, a stall, or anything that would make a senior engineer ask "why did you do that?" — it STOPS and escalates **up exactly one tier** with: what it was doing, the specific blocker, and its proposed resolution. It does not silently expand scope, edit a sibling tier's outputs, or push through. Only the Lead escalates to the human.
- **Git always rolls up to the Lead.** Tiers 2 and 3 never stage, commit, tag, or push (sandbox-blocked). They record the intended atomic-commit breakdown in the phase report; the Lead executes vendor-clean commits and tags at the phase gate (see AGENTS.md Commit policy).

## 2. Atomic task properties (non-negotiable)

- **Bounded duration**: typically 5–30 min of Codex wall-clock. If a brief would take more than ~30 min, decompose it further before dispatching.
- **Gap-free brief**: per the canonical's self-containment rule and Codex's "plan first" guidance, the task must execute end-to-end without bouncing back questions the steering documents already answer. A novice subagent with only the working tree and this brief must succeed.
- **Single responsibility**: one coherent change. If it spans multiple architectural concerns, decompose.
- **File-owned**: declares the files it owns and the files it must not touch (per the AGENTS.md file-ownership rule).
- **Definition of done explicit**: which gates to run, what evidence to produce, where artifacts land.
- **Observable acceptance**: the orchestrator verifies completion via the phase report, gate logs, and — for any user-visible change — Lead-owned live-turn evidence where required, NOT by re-reading the implementation. Acceptance is phrased as behavior a human can verify.

## 3. How the phase orchestrator decomposes a phase

The phase plan skeleton (Section 6) is authored upstream — generated during the Lead's off-clock pre-build from NORTH_STAR.md + AGENTS.md, one per milestone. Lead-authored phase plans specify phase-level workstreams: what must exist when the phase ends, grouped by concern. The phase orchestrator (Tier 2) consumes its `phase-plans/<n>.md`, owns decomposition, and appends its atomic task list to the phase plan; that list, not the Lead's workstreams, is the dispatch contract for workers. If the plan turns out incomplete or wrong, the orchestrator escalates BLOCKED to the Lead and amends the plan before continuing (Section 8) — it does not silently expand scope.

Given its phase plan:

1. Re-read the phase plan and confirm its acceptance criteria, owned/forbidden files, and gates are unambiguous.
2. Identify and FREEZE the contract before decomposition: result schema, DB schema, route boundaries, type signatures, file-ownership map — whatever applies to that phase.
3. Append the atomic task list that, run in order or in parallel, satisfies the phase's definition of done.
4. For each atomic task, declare: a time estimate (Section 5), the files it owns, and whether it is parallelizable with other tasks in the phase.
5. Dispatch the first round. Stay serial unless the contract is frozen AND the tasks are genuinely file-disjoint (see AGENTS.md parallelism policy); a 4-hour analytics build is often faster serial. Apply the AGENTS.md role-effort policy when launching each worker, and record any inability to set per-worker effort as a deviation.

### Worker subtypes

The phase orchestrator may dispatch specialized workers when the work is bounded and evidence-producing. Use these as planning categories, not as new authority layers:

- **Implementation worker** — one atomic coding task inside owned files, with local gates and a concise diff summary.
- **Verification / QA worker** — exact gate commands, route checks, authenticated HTTP form flow where appropriate, and phase DoD checklist. Returns pass/fail evidence and repros.
- **Docs / reporting worker** — summarizes existing evidence into a phase report, ADR, or run report. Does not invent evidence.
- **Code-reading worker** — traces a flow or enumerates edge cases without editing files. Returns file:line findings.
- **Commit / packaging helper** — Lead-only and unsandboxed if used, because sandboxed tiers cannot write `.git`. Executes the Lead-approved commit plan and scan commands.

Verification and docs/reporting workers are especially useful at phase gates because they keep the orchestrator's context focused on decisions rather than raw output scanning.

## 4. Living document requirements

Every plan — phase plans AND this file — maintains the four canonical sections, kept current at every stopping point. They are not optional; they make the next orchestrator's job mechanical:

- **Progress** — a checklist of granular work with timestamps and completed/partial/blocked status. Always reflects the actual current state; split a partially-done item into "done" and "remaining" rather than leaving it ambiguous.
- **Decision Log** — every decision with its rationale, date, and author. It must be unambiguous why any change was made.
- **Surprises & Discoveries** — unexpected behaviors, bugs, or insights, each with concise evidence (test output is ideal).
- **Outcomes & Retrospective** — at each milestone or completion: achieved vs. intended, what remains, and lessons to encode upstream (into AGENTS.md, NORTH_STAR.md, or this file).

A plan must be restartable from ONLY the plan and the working tree, with no external memory.

Living sections have an owner and a deadline: the **phase orchestrator** updates its phase plan's Progress, Decision Log, and Surprises sections **at handoff, in the same commit as the phase report**. A phase whose plan still reads "not started" after the phase gate is a review-gate failure, not a cosmetic issue.

## 5. Time budget calibration

Starting estimates for this project shape. These are CALIBRATION POINTS, not rules — use them as a first estimate, then recalibrate.

- Phase 0 bootstrap class (scaffold, harness, ADR): ~10–20 min/task
- Phase 1 walking-skeleton class (auth, seed, dashboard, stub analysis): ~15–25 min/task
- Phase 2 engine class (SDK integration, snapshot, prompt, engine, tests): ~10–15 min/task
- Phase 3 polish class (capture fixes, UI panels, README, demo script): ~5–10 min/task
- Hotfix class (single-defect remediation): ~3–10 min/task

**Recalibration rule**: after a phase lands, compute its `actual_minutes / estimated_minutes` ratio and multiply the remaining phases' estimates by it. A comparable project shape ran in ~53 min of Codex compute, so estimates that feel generous usually are.

## 6. Phase plan skeleton

Every `phase-plans/phase-NN-<name>.md` follows this structure. Reference this file at the top and note the plan is maintained per PLANS.md.

- **Purpose** — what the user gains, in NORTH_STAR terms.
- **Acceptance criteria** — observable behavior, verifiable by a human.
- **Frozen contracts** — schemas, types, the file-ownership map, the gates to run.
- **North Star acceptance slice** — which `NORTH_STAR.md` criteria this phase advances, including whether cheap-query measurements, normal-app-path live SDK proof, or the download artifact are in scope.
- **Lead-owned gate checklist** — live SDK proof, visual smoke, vendor scan, commit/tag/push, and any other checks the sandboxed phase cannot complete.
- **Phase-level workstreams** — Lead-authored groups of work that describe what must exist when the phase ends.
- **Orchestrator-authored atomic task list** — appended at phase start; each task has a title, owned files, time estimate, parallelizability, and definition of done, and this list is the worker dispatch contract.
- **Progress** — kept current (Section 4).
- **Decision Log** — decisions made during execution (Section 4).
- **Surprises & Discoveries** — deviations from expectation, with evidence (Section 4).
- **Outcomes & Retrospective** — at phase complete: what worked, what to encode upstream (Section 4).

## 7. When NOT to use atomic-task decomposition

The methodology has overhead; skip it when it does not pay for itself:

- **Prototyping / exploration** where the contract is not knowable in advance → dispatch a single exploratory brief; formalize into atomic tasks once the contract emerges.
- **Single-defect hotfixes** → one focused brief is enough; skip the ceremony.
- **Pure refactors spanning many files** → clean file-ownership decomposition is hard; consider a sequential single-thread approach instead.

## 8. Anti-patterns

- Do NOT dispatch atomic tasks against a not-yet-frozen contract — frozen contracts are the precondition for parallel, gap-free execution.
- Do NOT dispatch concurrent harness sessions on the same ambient auth (shared-auth contention is a suspected stall trigger; serialize).
- Do NOT let a launch prompt drift into background context. Re-check it before scope and gate decisions, and report deviations at handoff.
- Do NOT allow workaround tests that mock missing production code (see AGENTS.md "No workaround tests").
- Do NOT allow subagents to edit Lead-owned docs — `NORTH_STAR.md`, `AGENTS.md`, this file.
- Do NOT extend a phase boundary mid-execution without amending the phase plan first (surface to the orchestrator, then amend).
- Do NOT push through a blocker silently. Escalate BLOCKED up exactly one tier with diagnosis + proposed resolution; do not edit a sibling/parent tier's outputs or expand scope to route around it.
- Do NOT attempt git history operations below Tier 1. Tiers 2 and 3 are sandboxed and cannot write `.git`; record the commit breakdown and let the Lead commit.

## Progress

- [x] (June 8 2026) PLANS.md authored from the canonical ExecPlan pattern, adapted for orchestrator-subagent execution.
- [x] (June 8 2026) Generalized to the four-tier execution model (human supervisor / Codex Project Lead / phase orchestrator / subtask worker), with git ownership pinned to Tier 1 and a cross-tier handoff + BLOCKED escalation protocol. See ADR 0006.

## Decision Log

- Decision: Adopt the canonical PLANS.md/ExecPlan structure but invert the execution model to orchestrator-decomposes / subagents-execute.
  Rationale: our build uses sandboxed Codex subagents that cannot self-iterate across a multi-hour thread; the orchestrator owns decomposition and gating. See `docs/decisions/0005-planning-methodology.md`.
  Recorded by the orchestrator during pre-build (see ADR 0005).
- Decision: Split execution into four tiers (Human supervisor / Project Lead / phase orchestrator / subtask worker) and pin all git history to the Lead, the only unsandboxed agent tier; keep ambient CLI auth + serialized sessions as the default ($0, contention-free).
  Rationale: the `.git` write block is a sandbox property, so commit/tag/push can only roll up to the unsandboxed agent tier; ambient auth shares one CLI login that does not tolerate concurrent sessions, making serial the safe default. See `docs/decisions/0006-execution-tiers-and-auth.md`.
  Recorded by the Project Lead (see ADR 0006).

## Surprises & Discoveries

- Observation: The canonical's living-document sections map cleanly onto per-phase plans with no change; only the execution model needed adapting.
  Evidence: prior phase plans already carried Progress/Decision Log/Outcomes content informally; this formalizes it.

## Outcomes & Retrospective

- This file is reusable across any Codex-driven project. Project-specific content stays in `NORTH_STAR.md` and `phase-plans/`; operational rules stay in `AGENTS.md`. If a future run finds a planning gap, encode the fix here, not in a one-off brief.
