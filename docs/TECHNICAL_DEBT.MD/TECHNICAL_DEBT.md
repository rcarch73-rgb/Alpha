# Verified Engine Technical Debt

**Scope:** `app/js/verified-engine.js`

This page records the debt that is visible in the verified engine today. None of this is a request to modify the protected core in the same task; it is a maintenance record for future controlled work.

## 1. Hard-coded tax-year assumptions

The federal and provincial tax tables are encoded directly for 2026, with year-based indexing layered on top. That is stable for the current baseline, but it means a future tax-year refresh must be edited by hand and validated carefully.

## 2. Global module coupling

`HNIncome` and `HNProjection` depend on earlier modules through shared globals. This is simple for the current browser build, but it hides dependencies and makes isolated loading or bundling harder to reason about.

## 3. Name-based ownership resolution

Income sources and milestones are matched to people by name, with fallback behaviour when the owner is missing. That keeps the code permissive, but it can misattribute values when names are blank, duplicated, or changed.

## 4. Silent numeric coercion

The engine repeatedly uses a helper that converts invalid numeric input to `0`. That prevents runtime crashes, but it also risks masking upstream data-quality problems that should ideally be visible.

## 5. Fixed projection solver loop

`HNProjection.buildProjection()` resolves withdrawals with a fixed 20-iteration loop and a small convergence threshold. It works for the current baseline, but it is still a magic-number solver that should be documented and revisited if the projection model grows.

## 6. Embedded self-tests without enforcement

Each module includes `runSelfTests()`, which is good for local validation, but there is no in-file enforcement that these tests must pass before the engine is used. The validation step lives outside the protected core.

## 7. Manual maintenance burden

The engine includes province-specific tax logic, Ontario adjustments, British Columbia reductions, and Quebec abatements inline. That is accurate for the baseline, but it creates a maintenance surface that must be reviewed whenever tax rules change.
