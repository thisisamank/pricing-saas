# Model file

`pricing-model.json` is the only input to the report. See `examples/form-builder.model.json` for a complete file. All money uses one base currency.

## Required fields

| Field | Meaning |
|---|---|
| `product` | `{ "name", "date" }` |
| `summary` | The main finding in one to three short sentences. |
| `primaryPlan` | The key of the plan to show in the customer section. |
| `meters` | Each billable thing, by key. |
| `units` | The actions that customers do. |
| `plans` | Every plan. Exactly one has `"free": true`. |
| `revenue` | Markets and losses. |
| `mix` | Share of paying customers on each plan. Shares add up to 1. |
| `scenarios` | Forecast cases. |

## Meters

```json
"email": { "label": "Emails", "vendor": "Postmark", "free": 3000, "rate": 0.001 },
"events": { "label": "Events", "vendor": "Analytics", "tiers": [[1000000, 0], [1000000, 0.00005], [null, 0.00001]] },
"storage": { "label": "File storage (GB)", "vendor": "S3", "rate": 0.023, "accumulate": true }
```

`free` is the free amount each month. `rate` is the price of one item. In `tiers`, each entry is `[size, rate]`, and `null` means no end. `accumulate` means that the usage stays and grows each month. The report multiplies it by `retentionMonths` (12 by default).

## Units

```json
{
  "key": "ai", "label": "AI action", "plural": "AI actions",
  "definition": "One request to the AI.",
  "uses": { "requests": 3 },
  "variants": [
    { "key": "draft", "label": "Draft", "does": "Writes a document", "share": 0.2, "uses": { "tokens_in": 9000, "tokens_out": 2000 } },
    { "key": "edit", "label": "Edit", "does": "Changes text", "share": 0.8, "uses": { "tokens_in": 2000, "tokens_out": 500 } }
  ]
}
```

`uses` gives the quantity of each meter for one unit. Variant shares add up to 1. `variants` is optional.

## Plans

```json
{
  "key": "team", "name": "Team", "priceLabel": "$59", "listPrice": 59,
  "period": "each month", "who": "For small teams.", "highlight": true,
  "prices": { "us": 59, "in": 3999 },
  "normal": { "ai": 150 }, "heavy": { "ai": 300 }, "limits": { "ai": 500 },
  "variantLimits": { "ai": { "draft": 75 } },
  "points": ["500 AI actions", "5 people"]
}
```

- `prices` has one entry for each market, in that market's currency.
- `limits` must be numbers. For an unlimited plan, use the highest usage that you expect.
- `heavy` is optional.
- A quoted plan has `"quoted": true`, `"quote"`, and `"keepShare"` (the share of the quote that you keep).
- `listPrice` is the monthly price in the base currency. Use the minimum price for a quoted plan.

## Revenue

```json
"revenue": {
  "lossPerCustomer": 0.07,
  "markets": [
    { "key": "us", "label": "US", "share": 1, "perBase": 1, "taxRate": 0, "feePct": 0.03, "feeFixed": 0.3 }
  ]
}
```

`perBase` is the local currency for one unit of base currency. `taxRate` applies when the price includes tax. Use 0 when tax is added on top. `feeFixed` is in the base currency.

## Scenarios

```json
"scenarios": [{ "label": "Normal use", "payingShare": 0.01, "freeActive": 0.3, "usage": "normal" }]
```

`usage` is `normal`, `heavy`, or `limits`. The first scenario is the main one.

## Optional fields

| Field | Meaning |
|---|---|
| `perActiveUser`, `perRegisteredUser` | Meter use for each user each month. |
| `fixedCosts` | `[{ "label", "monthly" }]` |
| `retentionMonths` | Months of stored data in the forecast. |
| `userCounts` | Forecast sizes. |
| `lowSales` | `{ "shares": [0.01, 0.005], "freeActive": 0.3, "mix": {} }` |
| `goals` | `[{ "label", "amount" }]` |
| `value` | `{ "volumeLabel", "examples": [{ "label", "plan", "volume", "minutes", "hourly", "direct", "revenueGain", "usage": {} }] }` |
| `competitors` | `[{ "name", "plan", "price", "limit" }]` |
| `sales` | `{ "annualPay", "multiple" }` |
| `features` | `[{ "group", "rows": [["Feature", "yes", "no", "soon", "Text"]] }]`, with one value for each plan in order. |
| `recommendations` | `[{ "title", "detail" }]` |
| `evidence` | `[{ "what", "type", "source" }]`. `type` is `measured`, `vendor`, `estimate`, or `assumption`. |
| `excluded` | What the numbers do not include. |
| `sources` | `[{ "label", "url" }]` |
| `display` | `{ "symbol": "$", "secondary": { "symbol": "₹", "perBase": 96 } }` |
