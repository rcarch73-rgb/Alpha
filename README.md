# Harbour North Foundation Alpha v0.3.1

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
