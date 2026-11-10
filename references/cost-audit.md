# Cost audit

The goal is one list of billable meters, and one list of units that use those meters.

## 1. Find each vendor

Search these places in the repo:

- Dependency files: `package.json`, `requirements.txt`, `go.mod`, `Gemfile`, `Cargo.toml`.
- Deployment files: `wrangler.*`, `vercel.json`, `netlify.toml`, `fly.toml`, `render.yaml`, `Dockerfile`, Terraform, Kubernetes files.
- Names of environment variables and secrets. Read only the names, never the values.
- Outbound calls: `fetch(`, `axios`, `httpx`, and SDK clients.
- AI model names and prompts.
- Analytics, logging, error tracking, email, SMS, storage, search, and queue products.

Do not forget the costs that are outside the code: domain, payment processor, tax, support tools, and paid accounts.

## 2. Choose the units

A unit is an action that a customer does and that costs money. Choose 1 to 3 units that explain most of the cost. Examples are one signed contract, one AI action, one report, one video minute, one active seat, or 1,000 API calls.

If one unit has kinds with very different costs, model them as variants. A single average hides the expensive kind.

## 3. Count the use of each meter for one unit

Follow one complete action through the code. Count these items:

- Web requests, CPU time, and function calls.
- Database rows read, rows written, and bytes stored.
- Files stored, file operations, and egress.
- Queue messages and background steps.
- Emails, SMS messages, and push messages for all recipients and retries.
- Analytics events and log lines.
- AI input tokens, cached tokens, output tokens, and tool calls.

Add a small safety margin to estimates. Round up.

## 4. Estimate AI tokens

1. Prefer real token logs. If logs do not exist, recommend that the product records tokens on each call.
2. If you must estimate, load the real prompts and calculate about 1 token for each 4 characters of English text.
3. Include system prompts, history, retrieved text, and tool results in the input.
4. Include reasoning tokens in the output.
5. Add the price of web search and other tools.

## 5. Measure real usage

Use read-only access. Good sources are:

- Database row counts, average sizes, and usage tables.
- Object storage totals.
- Email and event logs.
- The vendor's billing or analytics page.
- Product analytics events.

If there are fewer than about 30 examples, mark the result as a small sample and say so in the report. Do not present it as an average of real customers.

## 6. Separate cost types

- **Variable cost** changes with usage.
- **Fixed cost** stays the same each month, such as a minimum plan or a domain.
- **Stored cost** grows each month because data stays. Use `accumulate: true`.
- **Free allowance** matters at small scale and disappears at large scale. Use `free` or `tiers`.

## 7. Revenue losses

Find whether prices include tax. If they do, tax comes out of the money that you keep. Record the payment fee for each market, the fixed fee, the subscription fee, refunds, and disputes.

## 8. Scale limits

Look for limits that force an engineering change, such as the maximum size of one database, write speed, email sending limits, and API rate limits. Add each limit that the forecast reaches to the recommendations.
