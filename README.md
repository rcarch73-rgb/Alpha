# Harbour North Foundation Alpha v0.4.2

Harbour North is a calm, question-led Canadian retirement decision platform. This alpha validates the approved first-use flow, Retirement Brief, recommendations, evidence, and one-change-at-a-time scenario comparison.

## Status

This is an **alpha development build**, not financial advice and not ready for public production use. Calculation results require continued regression testing against the established Harbour North engine.

## Quick start — local alpha mode

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`. Do not open the HTML directly with `file://`; browser module imports require a local web server.

## Enable Supabase authentication and cloud save

1. Copy `app/js/config.example.js` to `app/js/config.js`.
2. Add your Supabase project URL and anon/publishable key.
3. Run the SQL in `docs/SUPABASE_SETUP.md`.
4. Add local and deployed login URLs to Supabase Authentication redirect URLs.
5. Keep Row Level Security enabled.

`app/js/config.js` is ignored by Git. Never place a service-role key in browser code.

## GitHub repository setup

1. Create a new private repository.
2. Upload the **contents** of this folder to the repository root.
3. Commit the initial alpha checkpoint.
4. Do not add a `CNAME` file until deployment and the custom domain are intentionally configured.
5. Keep GitHub Pages disabled until authentication, RLS, and release tests are complete.

## Validation

```bash
node scripts/validate.mjs
```

The included GitHub Actions workflow runs the same check on pushes and pull requests.


## v0.4.2 income model
Step 3 now records employment, pension, CPP, OAS, and time-limited other income separately for each household member. The engine adapter assigns every source to its owner and applies its own start and end age.

## v0.4.2 engine reset

- The calculation modules in `app/js/verified-engine.js` are the Timeline, Income, Canadian Tax and Projection modules extracted unchanged from **Harbour North 4.0 RC3 Beta 2**.
- Scenario calculations no longer use a preview estimator or fallback financial math.
- Every displayed scenario is calculated by the same verified engine used for the current plan.
- The workable-scenario search now evaluates one full verified projection per retirement age rather than thousands of preview calculations.
- Scenario cache keys include the complete plan, including income sources, account balances, contributions, contribution end ages and assumptions.
- An engine failure is shown as an error and never replaced with an approximate result.
