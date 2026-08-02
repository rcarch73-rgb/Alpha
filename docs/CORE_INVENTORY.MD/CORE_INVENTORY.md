# Verified Engine Core Inventory

**Scope:** `app/js/verified-engine.js`

This page documents the verified retirement engine as a protected calculation core. It is intentionally read-only: it describes what the engine does, what it depends on, and why it stays protected.

## 1. Purpose

The file contains the authoritative year-by-year retirement engine for Harbour North. It computes household timelines, income activation, Canadian tax, spending, and portfolio projection results without involving any UI or persistence concerns.

## 2. Inputs

- `HNTimeline.buildTimeline(plan, options)` accepts a plan object plus `startYear` and `planningAge` options.
- `HNIncome.buildIncomeProjection(plan, timeline, options)` accepts a plan, the timeline rows, and `startYear` and `indexRate` options.
- `HNTax.estimatePersonTax()` and `estimateHouseholdTax()` accept taxable income, year, index rate, and province.
- `HNProjection.buildProjection(plan, incomeRows, options)` accepts the plan, the income projection rows, and options such as `startYear`, `indexRate`, and `returnSeries`.
- All modules expect plain JavaScript objects and numeric fields that can be safely coerced with `Number()`.

## 3. Outputs

- `HNTimeline` returns yearly rows with ages, retirement status, and milestone events.
- `HNIncome` returns yearly rows with income detail, taxable income, and non-taxable income.
- `HNTax` returns person-level and household-level tax breakdowns with federal, provincial, and total values.
- `HNProjection` returns yearly rows with spending, taxes, withdrawals, growth, ending balances, and reconciliation fields.
- Every module exposes a `runSelfTests()` function that returns `{ ok, total, failed }`.

## 4. Major Internal Components

- `HNTimeline` handles household inclusion, age math, milestone creation, and yearly timeline assembly.
- `HNIncome` handles source activity and indexed annual income projection.
- `HNTax` handles federal and provincial tax calculation, including the Ontario and British Columbia adjustments encoded in the engine.
- `HNProjection` handles annual spending, event cash flow, account ordering, withdrawal solving, tax recalculation, and balance reconciliation.

## 5. Dependencies

- Built-in JavaScript features: `Date`, `Math`, `Number`, `Intl`, and the shared `global`/`window` object.
- Internal module coupling: `HNIncome` depends on `HNTimeline`, and `HNProjection` depends on `HNTimeline`, `HNIncome`, and `HNTax` through the shared global namespace.
- No DOM, routing, local storage, authentication, or network dependencies are present in this file.
- Canadian tax constants and bracket values are encoded directly in the source.

## 6. Built-in Validation / Self-Tests

- `HNTimeline.runSelfTests()` checks age calculations, partner inclusion, inclusive endpoint handling, and event attachment.
- `HNIncome.runSelfTests()` checks active-source logic, indexed income compounding, and taxability splits.
- `HNTax.runSelfTests()` checks federal and provincial tax logic, Ontario health premium behaviour, Quebec abatement behaviour, and multi-person tax handling.
- `HNProjection.runSelfTests()` checks spending inflation, event classification, withdrawal order, tax optimisation, and reconciliation.
- `HNVerifiedEngine.runSelfTests()` in the adapter layer aggregates these module results into a single engine-level status.

## 7. Protected Status Recommendation

This is protected financial core logic and should remain unchanged unless a change is explicitly justified, regression-tested, compared against known outputs, and reviewed before release.

## 8. Observable Technical Debt

- Hard-coded 2026 tax constants make annual maintenance manual.
- Name-based owner matching can misattribute income or milestones when names are missing or duplicated.
- Numeric coercion to zero can hide upstream data issues instead of surfacing them.
- Module communication happens through globals instead of explicit imports or dependency injection.
- The projection solver uses a fixed 20-pass convergence loop and a hard-coded tolerance.
- Self-tests are embedded in the engine but are not automatically enforced by the engine itself.
