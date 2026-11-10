# SaaS pricing skill

An agent skill that studies any SaaS repo, finds what the product really costs, predicts the cost at 100 to 1,000,000 users, and recommends what to charge. Each repo gets the same self-contained HTML report.

## How it works

1. The agent reads the repo and finds each vendor, meter, and billable action.
2. The agent measures real usage where it has read-only access, and fetches current vendor prices.
3. The agent writes one file: `docs/pricing/pricing-model.json`.
4. `scripts/build.mjs` validates the file and builds the report. All calculations are in one place, so every repo gets the same math and the same page.

The agent never changes prices or production. The report is a recommendation.

## Install

Link this folder into your agent's skills folder:

```bash
ln -s "$(pwd)" ~/.claude/skills/pricing-saas
```

Then ask your agent to "work out the unit economics and pricing for this repo".

## Build a report by hand

```bash
node scripts/build.mjs examples/form-builder.model.json /tmp/unit-economics.html
open /tmp/unit-economics.html
```

## What the report contains

- The cost of each unit, and of each kind of action.
- The money that you keep from one customer, after tax and payment fees.
- Cost and gross margin for each plan: normal use, all limits, and worst case.
- A value calculator, and the lowest price that you can accept.
- Competitors, and which plans can pay for a salesperson.
- A forecast at each user count, and a low-sales case.
- Recommended tiers and a feature list.
- Pricing checks that pass or fail.
- How sure each number is: measured, vendor price, estimate, or assumption.

## Files

| Path | Purpose |
|---|---|
| `SKILL.md` | The workflow for the agent. |
| `references/` | Cost audit, pricing method, and model format. |
| `assets/engine.js` | All calculations. |
| `assets/render.js`, `assets/template.html` | The report page. |
| `scripts/build.mjs` | Validates a model and builds the report. |
| `scripts/engine.test.mjs` | Tests. Run `node --test scripts/`. |
| `examples/` | A complete model for a product with no AI cost. |
