# React + TypeScript + Vite

## Preview deployments

Push feature work to `codex/develop-dashboard` to create a Vercel Preview Deployment. The `main` branch is reserved for Production. All Preview branches and Local use the isolated Supabase Dev project via `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; Production retains Supabase Official. Copy `.env.example` to the ignored `.env` and fill in the Dev publishable key. Optional `VITE_OFFICIAL_VIEW_URL`/`VITE_OFFICIAL_VIEW_KEY` enable `/main-view`, a separate, authenticated, RLS-scoped read-only view of Official Project/Campaign/Task data. Never use a service-role key in Vite variables. See `../GUIDELINE/ENVIRONMENT_SPLIT_AND_OFFICIAL_RESET.md` for environment boundaries.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
