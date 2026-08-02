# Harbour North Constitution

**Version:** 2.0  
**Adopted:** August 2026  
**Status:** Foundational governance document  
**Supersedes:** Harbour North Constitution v1.0 (July 31, 2026)

## Purpose

Harbour North exists to help Canadians make confident retirement decisions with clarity, trust, and peace of mind. It is not trying to become the most complicated retirement application. Every feature, screen, calculation, recommendation, and line of code must support that purpose.

## Article I — Mission

Harbour North exists to help a person answer one question:

> **Can I retire with confidence?**

Everything else exists only to support that answer.

## Article II — Product promise

Every result and recommendation must be:

- explainable;
- verifiable;
- understandable in plain language;
- traceable to the assumptions and calculation that produced it.

Users must never be expected to trust Harbour North blindly.

## Article III — Customer first

Harbour North is built for people approaching or living in retirement. Technical sophistication matters only when it creates a calmer, clearer, and more useful experience.

## Article IV — The four product layers

1. **Decisions** — Retirement Brief, Recommendations, Plan Review.
2. **Evidence** — Charts, timeline, income, tax summary, scenario comparison.
3. **Detail** — Year-by-year projections, tax details, withdrawals, balances.
4. **Harbour North Studio** — Validation, golden tests, audit trail, regression, performance, release validation.

Layer 4 is never part of the normal customer experience.

## Article V — Calm above all

Every screen should leave the user feeling calmer and better informed. A feature that increases anxiety without improving understanding must be redesigned or removed.

## Article VI — One decision at a time

Harbour North guides users to the next most important decision. It does not overwhelm them with every possible analysis at once.

## Article VII — Progressive disclosure

Information appears in this order:

1. Answer
2. Evidence
3. Detail
4. Diagnostics

This order must not be reversed.

## Article VIII — One active plan

At any moment, Harbour North has exactly one active plan.

- The active plan must be explicit and identifiable.
- No screen may silently substitute another plan.
- A starter, sample, local fallback, cloud copy, or stale cached plan must never replace the active plan without a visible user action or a documented deterministic rule.
- The same active plan must feed calculation, recommendations, scenarios, reports, and review.

## Article IX — One authoritative calculation

A plan change follows one path:

> Active plan → normalization → verified engine → authoritative calculation result → UI

The current plan is calculated once for a render cycle. All customer-facing screens consume that same result.

No screen may independently calculate the current plan or maintain a competing result object.

## Article X — The verified engine is protected core

`app/js/verified-engine.js` and the approved adapter contract are protected core.

A change to protected financial logic requires:

- a written reason;
- focused regression tests;
- comparison against known results;
- documented review;
- explicit approval before release.

A financial-engine failure must be shown honestly. It must never be replaced silently by approximate or preview financial math.

## Article XI — UI never owns financial truth

The UI displays and explains data. It does not invent, infer, estimate, or silently default financial results.

A missing metric is displayed as unavailable—not converted into zero. A legitimate calculated zero remains zero.

## Article XII — Evidence-based recommendations

A financial recommendation must be produced by this process:

> Clone the active plan → change an explicit assumption → run the verified engine → compare measurable results

If a strategy was not tested, Harbour North may not present it as a quantified recommendation.

Informational reminders must be labelled as reminders, not ranked financial opportunities.

## Article XIII — One variable per independent scenario

Independent scenario tests change exactly one assumption. Examples include:

- retire one year later;
- begin CPP at a different age;
- reduce monthly spending by a stated amount;
- increase monthly savings by a stated amount.

Combined strategies may be explored only after their individual effects are visible and clearly disclosed.

## Article XIV — Recommendations explain themselves

A recommendation must identify:

- what changes;
- why it ranked where it did;
- measurable advantages;
- measurable disadvantages;
- any unavailable metrics;
- how the user would implement the change.

Harbour North must distinguish “the plan needs attention” from “none of the tested strategies passed the recommendation threshold.”

## Article XV — No hidden magic

Assumptions, thresholds, scoring weights, fallback behaviour, and data sources must be visible in code and documented. No important decision may depend on an undocumented implicit rule.

## Article XVI — Trust before beauty

When accuracy and appearance conflict, accuracy wins.

When clarity and feature count conflict, clarity wins.

When a release deadline and verification conflict, verification wins.

## Article XVII — Simplicity wins

When two designs produce comparable value, choose the simpler design. New modules must eliminate a real responsibility conflict; they must not merely move complexity into more files.

## Article XVIII — Architecture before features

No feature may:

- introduce a second source of truth;
- duplicate financial logic;
- bypass active-plan resolution;
- create a separate current-plan calculation;
- add another renderer for the same customer surface;
- mix business rules into presentation code without a documented reason.

When a feature requires bending the architecture, improve the architecture first.

## Article XIX — Feature admission test

A proposed feature must:

- improve a retirement decision;
- increase confidence or understanding;
- preserve calmness;
- fit one of the four product layers;
- be explainable in plain language;
- use the approved data flow;
- include a verification plan.

If it fails any item, it is not admitted.

## Article XX — Developer discipline

Developer tools improve quality; they do not expand the normal customer interface.

Copilot or any coding agent may implement a bounded change, but it may not determine the architecture. Architectural decisions must be written first, then implemented narrowly.

## Article XXI — Small changes and protected checkpoints

- One logical change per commit.
- Experiments occur on separate branches.
- A known-good checkpoint is created before architectural work.
- No force push, reset, merge, or branch deletion occurs without first preserving the current state.
- A milestone is not complete until it can be restored and reproduced.

## Article XXII — Verification before commitment

Before a functional commit:

- relevant automated tests pass;
- the actual browser workflow is tested;
- displayed values reconcile with the authoritative result;
- import, save, refresh, and active-plan behaviour are checked when affected;
- no unexpected console errors remain;
- changed files match the intended scope.

Static editor diagnostics alone do not prove runtime correctness.

## Article XXIII — The investigation rule

When the same bug survives two targeted attempts—or approximately 30 minutes of patching—stop editing.

Then:

1. map the data flow;
2. identify the authoritative source;
3. observe actual runtime values;
4. find the first divergence;
5. make one smallest safe fix.

Symptoms are not fixed one card at a time when they share a state problem.

## Article XXIV — Release standard

A release is complete only when:

- validation passes;
- regression tests pass;
- key browser flows pass;
- imports and exports work;
- displayed views reconcile;
- active-plan selection is deterministic;
- documentation is current;
- the Constitution remains satisfied.

## Article XXV — Stewardship

Harbour North is a long-term commitment to helping people make one of life’s most important financial decisions. Every release should make it simpler to use, easier to trust, and more capable of supporting a confident decision.

## Definition of done

A feature is done only when it:

- works correctly at runtime;
- is tested at the appropriate layer;
- uses the approved architecture;
- preserves the verified engine unless an approved engine change is the explicit purpose;
- is understandable to the user;
- improves the retirement-planning experience;
- can be safely restored or reverted.

## Guiding principle

> **Every release must leave Harbour North simpler to use, easier to trust, and more capable of helping someone make a confident retirement decision.**
