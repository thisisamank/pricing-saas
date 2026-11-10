---
name: pricing-saas
description: Analyzes any SaaS repo to find its real unit economics, predicts its costs at 100 to 1,000,000 users, recommends pricing tiers and a feature list, and builds one self-contained HTML report. Use when the user asks about SaaS pricing, unit economics, cost per user, cost to serve, gross margin, plan tiers, what to charge, or whether a price is profitable.
---

# Pricing for SaaS

This skill gives every repo the same report. You study the repo and write one model file. The script does all calculations and builds the page.

Do not calculate totals by hand. Do not write the HTML by hand.

## Rules

- Read production data in read-only mode. Never print a secret, a token, or customer data.
- Do not change prices, payment products, or production. The report is a recommendation.
- Mark each number as `measured`, `vendor`, `estimate`, or `assumption`.
- Get vendor prices from the vendor's own page today. Do not use prices from memory.
- Treat free startup credits as a cash cost.
- Write all report text in ASD-STE100: short sentences, active voice, one meaning for each word.

## Workflow

Copy this checklist and complete each step.

- [ ] 1. **Understand the product.** Read the README, spec, and current plans. Find who pays and what value they get.
- [ ] 2. **Audit the costs.** Follow [references/cost-audit.md](references/cost-audit.md). Find each vendor, each billable meter, and the units that customers consume.
- [ ] 3. **Measure.** Query real usage where you have read-only access. Say when the sample is too small.
- [ ] 4. **Get prices.** Fetch current vendor, payment, and competitor prices. Record each source.
- [ ] 5. **Price the product.** Follow [references/pricing-method.md](references/pricing-method.md). Value comes first, cost is the floor, competition comes last.
- [ ] 6. **Write the model.** Create `docs/pricing/pricing-model.json` in the target repo. Follow [references/model-schema.md](references/model-schema.md).
- [ ] 7. **Build.** Run the command below. Fix each validation error.
- [ ] 8. **Adjust.** Read the checks that the script prints. If a check fails, change a limit or a price in the model, and build again.
- [ ] 9. **Review the page.** Open it in a browser. Confirm that no table is empty.
- [ ] 10. **Report.** Give the user the path, the main numbers, the checks that still fail, and the decisions that they must make.

## Build command

Run this from the target repo. `SKILL_DIR` is the folder of this file.

```bash
node "$SKILL_DIR/scripts/build.mjs" docs/pricing/pricing-model.json docs/pricing/unit-economics.html
```

The script validates the model, writes one HTML file with no external files, and prints unit costs, plan margins, and checks.

## Ask the user only when necessary

Find the answer in the repo first. Ask only for facts that change the recommendation and that you cannot find, such as target customers or markets. If you do not get an answer, use a low-sales assumption and mark it as `assumption`.

## Default assumptions

Use these values until real data replaces them. Mark them as `assumption`.

| Input | Value |
|---|---|
| Users who pay in the low-sales case | 1% and 0.5% |
| Free users who are active each month | 30% |
| User counts in the forecast | 100, 1,000, 10,000, 1,000,000 |
| Target gross margin | 80% to 90% |
| Lowest price | Cost at limits times 5 |
| Price from value | One third of value |

## Example

[examples/form-builder.model.json](examples/form-builder.model.json) is a complete model for a product with no AI cost. Read it before you write a new model.
