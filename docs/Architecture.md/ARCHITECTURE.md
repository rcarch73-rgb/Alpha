# Harbour North Architecture

**Document version:** 1.0  
**Baseline audited:** `stable-recovery` at commit `695c27f`  
**Application version declared by repository:** v0.4.3

## 1. Purpose of this document

This document records what the protected recovery baseline actually does today and defines the target architecture for future work. It is descriptive first and prescriptive second. Code must not be changed merely to make the diagram look cleaner; every migration must be small, tested, and reversible.

## 2. Current recovery-baseline architecture

The recovery baseline is primarily a single-page application implemented in `app/index.html`, with the verified financial engine loaded before the page-level application script.

```text
Browser
  │
  ├── localStorage: harbourNorth.foundation.v0.1
  │         │
  │         ▼
  │     `plan` in app/index.html
  │         │
  │         ├── form binding / collection / save
  │         │
  │         ▼
  │   HNVerifiedEngine.calculate(plan)
  │         │
  │         ▼
  │      `result`
  │         │
  │         ├── Retirement Brief / Overview
  │         ├── Evidence
  │         ├── Recommendations
  │         ├── Scenario comparison
  │         ├── Plan Review
  │         └── Validation view
  │
  └── Supabase auth + cloud bridge (optional)
             │
             └── may apply a plan through HNCloudBridge
```

This baseline is understandable because the active plan and current result are both held in the page-level application scope:

- `plan` is initialized from `localStorage` key `harbourNorth.foundation.v0.1`.
- `result` is assigned by `calculateAndRender()` or other explicit render paths.
- `window.HNCloudBridge.applyPlan()` replaces `plan`, saves it, rebinds the form, and recalculates.

## 3. Current module responsibilities

### `app/js/verified-engine.js`

Protected financial calculation modules extracted from the established Harbour North engine. It contains timeline, income, tax, and projection logic and exposes the lower-level verified modules used by the adapter.

**Must not:** know about DOM elements, local storage, routing, recommendation presentation, or authentication.

### `app/js/engine-adapter.js`

Translates the Foundation/legacy plan shape used by the UI into the structured plan expected by the verified engine, invokes the verified modules, and returns the customer-facing calculation contract.

The page currently expects fields including:

- `engine`
- `series`
- `rows`
- `retirementStart`
- `sustainable`
- `ending`
- `ratio`
- `status`
- `confidence`
- `annualSpend`
- `yearsTo`
- `yearsRet`

**Must not:** select the active plan, render UI, or invent recommendation copy.

### `app/index.html`

Currently owns most application orchestration and presentation:

- default and migrated plan shape;
- local plan loading and saving;
- form collection and binding;
- current-plan calculation;
- navigation and routing;
- Retirement Brief rendering;
- evidence rendering;
- rule-based recommendation copy;
- verified scenario comparison;
- import/export/reset;
- Plan Review;
- validation UI.

This concentration is acceptable for the protected recovery baseline because it is traceable. It is not the desired final separation of responsibilities.

### `app/js/auth/auth.js`

Handles Supabase authentication/session behaviour and works with the cloud bridge exposed by the application.

**Must not:** calculate plans or directly render financial results.

### `app/js/studio/studio.js`

Developer/Studio behaviour. It belongs to Layer 4 of the Constitution and must remain outside the normal customer experience.

## 4. Authoritative current-plan flow

For the recovery baseline, the approved current-plan path is:

```text
local plan or explicitly applied cloud plan
        ↓
page-level `plan`
        ↓
form `collect()`
        ↓
HNVerifiedEngine.calculate(plan)
        ↓
page-level `result`
        ↓
customer views
```

The same plan object must be used when calculating the current result, saving locally, exporting, creating scenarios, and completing Plan Review.

## 5. Scenario flow

Scenario comparison is separate from current-plan state:

```text
current `plan`
   ↓ clone + explicit scenario controls
normalizedScenarioPlan()
   ↓
calculateScenario()
   ↓
HNVerifiedEngine.calculate(scenarioPlan)
   ↓
scenario result + comparison UI
```

A scenario must never overwrite the active plan unless the user explicitly adopts it. Scenario cache keys must include all financially material inputs.

## 6. Known constitutional issues in the recovery baseline

These are audit findings, not instructions to patch everything immediately.

### A. Preview-engine fallback exists

`calculate()` catches a verified-engine failure and returns `previewEngine(plan)`. This conflicts with the repository README and Constitution, which require engine failures to be shown rather than silently replaced with approximate financial math.

**Recovery priority:** high.  
**Safe treatment:** first add a tested visible engine-error state; then remove the silent fallback in a separate commit.

### B. Business and presentation logic are concentrated in `app/index.html`

This makes the baseline easy to trace but difficult to evolve. It is not itself a reason for a large refactor.

**Recovery priority:** medium.  
**Safe treatment:** extract only stable boundaries after behaviour is protected by tests.

### C. Recommendations are rule-based, not scenario-ranked

`recommendationData()` uses plan/result conditions and informational rules. These are useful prompts but are not yet quantified, evidence-based recommendations under Constitution Article XII.

**Recovery priority:** medium after baseline stabilization.  
**Safe treatment:** call them “planning considerations” until the scenario-driven recommendation pipeline is reintroduced and verified.

### D. One local storage key represents the working plan

The recovery baseline does not contain a full active-plan repository/resolver. This is simple and predictable locally, but cloud/saved-plan selection requires a clearly documented boundary before multiple plans are reintroduced.

**Recovery priority:** high before restoring multi-plan functionality.

### E. Some rendering paths call `calculate()` directly

Evidence, Plan Review, and scenario surfaces may calculate on demand. The baseline generally shares `result`, but it does not yet enforce a single immutable page-state object.

**Recovery priority:** medium.  
**Safe treatment:** establish an application-state coordinator only after current behaviour is covered by integration tests.

## 7. Protected target architecture

The target is deliberately small:

```text
Plan Repository
      │
      ▼
Active Plan Resolver
      │
      ▼
Plan Normalizer / Adapter Boundary
      │
      ▼
Verified Engine (once per current-plan revision)
      │
      ▼
Application State
{ plan, calculation, recommendations, readiness, revision }
      │
      ├── Retirement Brief
      ├── Evidence
      ├── Plan Health
      ├── Recommendations
      ├── Plan Review
      └── Reports

Scenario Service
      │ clones Application State.plan
      │ changes explicit assumptions
      ▼
Verified Engine
      ▼
Scenario Results (never replace current state without adoption)
```

## 8. Target responsibility boundaries

### Plan Repository

Loads, saves, imports, exports, and identifies plans. It does not calculate or render.

### Active Plan Resolver

Returns one explicit active plan and its source/identifier. It does not choose arbitrary “meaningful” plans. Selection precedence must be deterministic and tested.

### Calculation Coordinator

Given a plan revision, it normalizes and invokes the verified engine once, then creates the authoritative application state. It does not render individual cards.

### Application State

A single read-only snapshot for a render cycle:

```js
{
  plan,
  calculation,
  recommendations,
  readiness,
  revision
}
```

Renderers receive this object. They do not read raw local storage or independently calculate the current plan.

### Scenario Service

Creates independent scenario plans, invokes the same verified engine, and returns comparisons. It cannot mutate the active plan.

### Recommendation Service

Consumes the active plan, authoritative baseline calculation, and scenario results. It does not perform financial math itself.

### Renderers

Translate state into views. They cannot select plans, normalize financial inputs, calculate financial metrics, or establish recommendation thresholds.

## 9. Migration rules

1. Protect the recovery baseline with tests before extracting modules.
2. Change one responsibility boundary per commit.
3. Do not reintroduce the recent recommendation branch wholesale.
4. Recover valuable code by cherry-picking concepts, not merging architecture blindly.
5. Keep current-plan calculation and scenario calculation visibly distinct.
6. Never combine active-plan work with recommendation work in the same milestone.
7. Maintain a browser checklist for every state-related change: load, save, refresh, import, cloud apply, scenario adopt.

## 10. Protected files and review levels

### Level 1 — Protected financial core

- `app/js/verified-engine.js`
- financial portions of `app/js/engine-adapter.js`

Changes require calculation regression evidence.

### Level 2 — State and persistence core

- current-plan initialization in `app/index.html`
- `window.HNCloudBridge`
- import/export/reset paths
- any future plan repository or active-plan resolver

Changes require startup, refresh, import, and plan-identity tests.

### Level 3 — Presentation and customer copy

- customer renderers
- styling
- recommendation explanations

Changes require browser verification and must not introduce calculations.

## 11. Architectural definition of done

A state-related milestone is complete only when:

- the plan source and identifier are observable;
- the calculation uses that exact plan;
- all affected surfaces use the same current result;
- scenarios use cloned plans;
- refresh restores the intended plan;
- imports and cloud application do not create stale state;
- tests pass at runtime;
- no temporary diagnostics remain;
- the changed-file scope matches the milestone.
