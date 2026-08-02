# Golden Plan 1.0

## Purpose

Golden Plan 1.0 is the canonical regression fixture for Harbour North Core. It protects the verified financial result from accidental changes in calculation, adaptation, or orchestration code.

This is an engineering fixture based on a realistic Canadian couple. It is not a user account, a sample silently loaded by the application, or financial advice.

## Fixed valuation date

The regression test fixes the current date at **August 1, 2026**. The engine adapter derives birth years and projection years from the current year, so the date must be frozen for reproducible results.

## Canonical inputs

The machine-readable fixture is stored at:

`tests/fixtures/golden-plan-1.json`

### Household and goal

| Input | Value |
|---|---:|
| Household | Couple |
| Primary age | 52 |
| Partner age | 46 |
| Primary retirement age | 55 |
| Partner retirement age | 55 |
| Monthly spending target | $6,000 |
| Planning horizon | Age 95 |
| Province | British Columbia |

### Assets and contributions

| Input | Value |
|---|---:|
| Primary RRSP | $496,000 |
| Primary TFSA | $48,000 |
| Primary non-registered | $0 |
| Primary monthly RRSP contribution | $2,300 until age 55 |
| Partner registered/tax-free/non-registered assets | $0 |

### Income

| Source | Annual amount | Start/end |
|---|---:|---|
| Primary employment | $92,000 | Current age to 55 |
| Primary CPP | $15,700 | Age 65 onward |
| Primary OAS | $8,600 | Age 65 onward |
| Primary WCB benefit, non-taxable | $16,200 | Age 52 to 65 |
| Partner employment | $110,000 | Current age to 55 |
| Partner pension | $38,400 | Age 55 onward |
| Partner CPP | $16,400 | Age 65 onward |
| Partner OAS | $8,600 | Age 65 onward |

### Assumptions

| Input | Value |
|---|---:|
| Nominal return | 5.0% |
| Inflation | 2.0% |

## Protected expected outputs

Using `app/js/verified-engine.js` through `app/js/engine-adapter.js`, with the valuation date fixed at August 1, 2026:

| Output | Expected value |
|---|---:|
| Engine | `verified` |
| Portfolio at retirement | $1,107,223.10 |
| Sustainable monthly spending | $9,240.18 |
| Ending assets, real dollars | $3,374,666.14 |
| Plan ratio | 1.5400302410 |
| Status | `ontrack` |
| Confidence | 92 |
| Annual spending target | $72,000 |
| Years to primary retirement | 3 |
| Retirement years | 40 |
| Projection rows | 50 |
| Retirement series rows | 47 |
| Built-in engine tests | 29 passed, 0 failed |

## Acceptance rule

A normal product change must reproduce these results within the tolerances encoded in `tests/golden-plan.test.mjs`.

A deliberate financial-model change may update the expected values only when all of the following are provided:

1. The reason for the model change.
2. Independent verification of the new financial rule.
3. Updated unit and regression tests.
4. A recorded architecture decision.
5. Explicit review and approval before merge.

## Run the regression

```bash
node --test tests/golden-plan.test.mjs
```

Run the full repository validation as well:

```bash
npm run validate
```

## Protected boundary

The Golden Plan directly protects:

- `app/js/verified-engine.js`
- `app/js/engine-adapter.js`
- the legacy-plan translation contract
- the verified result shape used by Harbour North

It does not validate presentation copy, browser storage, authentication, or recommendation quality. Those require separate integration tests.
