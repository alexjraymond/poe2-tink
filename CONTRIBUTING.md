# Contributing

## Workflow

This project uses a trunk-based workflow with a protected `main`:

1. **Every change starts with an issue** (a "ticket"). Issues capture the problem,
   the proposed solution, and acceptance criteria.
2. **Branch off `main`** using a descriptive name:
   - `feat/<short-description>` for features
   - `fix/<short-description>` for bug fixes
   - `chore/<short-description>` for tooling/maintenance
3. **Open a pull request** that references the issue (`Closes #123`). CI must pass.
4. **Never push directly to `main`** — it is protected. All changes land via PR.

## Commits

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add trade search bookmarking
fix: handle exchange URLs without a search id
chore: add CI workflow
```

## Local development

```bash
npm install
npm run dev      # builds to dist/ with HMR
npm run lint     # type-check
npm run build    # production build
```

Load the unpacked extension from `dist/` at `chrome://extensions` (Developer mode).
