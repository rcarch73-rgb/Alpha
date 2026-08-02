# Harbour North Recovery Plan

**Foundation:** `stable-recovery` commit `695c27f`  
**Goal:** restore a trustworthy, understandable product before reintroducing newer recommendation and multi-plan features.

## Ground rules

- No new customer features during recovery.
- No broad refactors.
- No direct merge from `main` or `recommendation-integration-wip` into the recovery branch.
- Every change must comply with `docs/CONSTITUTION.md`.
- Every milestone gets its own branch or checkpoint commit.

## Milestone R0 — Protect the baseline

- [x] Preserve Git history and experimental branches.
- [x] Identify the recovery baseline.
- [x] Record the Constitution.
- [x] Record current and target architecture.
- [ ] Run repository validation on the recovery copy.
- [ ] Test the baseline in Safari through a local HTTP server.
- [ ] Record a known-good test plan and expected headline results.
- [ ] Tag the protected recovery checkpoint.

**Exit condition:** the baseline loads, saves, refreshes, imports, calculates, and renders consistently for the known test plan.

## Milestone R1 — Protect financial truth

- [ ] Add/confirm golden current-plan results for the known test plan.
- [ ] Add an integration test for the adapter’s public result contract.
- [ ] Add a visible engine-error state.
- [ ] Remove the silent preview-engine fallback only after the error-state test passes.
- [ ] Confirm current and scenario calculations both use the verified engine.

**Exit condition:** no approximate calculation can silently reach a customer screen.

## Milestone R2 — Define one application state

- [ ] Document all current calls to `calculate()`.
- [ ] Introduce a small calculation coordinator without changing outputs.
- [ ] Create one current-state snapshot for a render cycle.
- [ ] Make Brief, Evidence, Plan Review, and recommendations consume the same baseline result.
- [ ] Keep scenario results separate.

**Exit condition:** one plan revision produces one authoritative current calculation.

## Milestone R3 — Stabilize plan identity

- [ ] Define a plan identifier and source contract.
- [ ] Protect the existing single local working-plan behaviour.
- [ ] Add tests for load, save, refresh, import, reset, and cloud apply.
- [ ] Reintroduce multiple saved plans only after deterministic selection tests exist.
- [ ] Never select a plan by “meaningfulness” alone.

**Exit condition:** the application can always state which plan is active and why.

## Milestone R4 — Separate stable presentation boundaries

- [ ] Extract render-only functions from `app/index.html` in small batches.
- [ ] Do not move business rules merely to reduce file size.
- [ ] Keep customer copy and financial values separate.
- [ ] Confirm every extraction with before/after browser comparisons.

**Exit condition:** renderers receive state and do not own plan selection or calculation.

## Milestone R5 — Reintroduce recommendation intelligence

- [ ] Rename current rule-based items as planning considerations where appropriate.
- [ ] Recover one scenario generator at a time from the WIP branch.
- [ ] Verify one-assumption changes and baseline immutability.
- [ ] Add scorer and ranking only after scenario outputs are visible and trusted.
- [ ] Do not force recommendations when none pass the threshold.
- [ ] Add explanation and implementation guidance after ranking is stable.

**Exit condition:** every quantified recommendation is supported by a verified scenario comparison.

## Milestone R6 — Beta readiness

- [ ] Complete release checklist.
- [ ] Validate representative single and couple plans.
- [ ] Test low-asset, pension-heavy, RRSP-heavy, TFSA-heavy, early-retirement, and incomplete plans.
- [ ] Verify authentication and RLS with separate accounts.
- [ ] Test Safari, Chrome, iPad, and mobile widths.
- [ ] Verify import/export compatibility and recovery.
- [ ] Freeze a beta candidate and run the complete regression suite.

## Known-good test-plan requirement

Before further architecture work, create a sanitized fixture that includes:

- household type;
- both ages and retirement ages;
- spending target;
- employment income;
- pension/CPP/OAS assumptions;
- RRSP, TFSA, and non-registered balances;
- contributions and end ages;
- return, inflation, province, and horizon;
- expected sustainable amount, retirement-start portfolio, ending assets, ratio, confidence, and status.

The fixture—not a browser’s changing local storage—becomes the reference used to judge regressions.

## Commit discipline

Recommended commit sequence:

1. `docs: restore Harbour North governance and architecture`
2. `test: protect stable recovery calculation contract`
3. `fix: show verified engine failures explicitly`
4. `refactor: centralize current calculation state`
5. `test: protect active plan identity and persistence`

No milestone moves forward while its preceding exit condition is unmet.
