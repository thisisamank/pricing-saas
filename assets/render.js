const R = compute(MODEL);
const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const symbol = MODEL.display?.symbol ?? "$";
const money = (v) => {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs === 0) return `${symbol}0`;
  if (abs >= 100) return `${sign}${symbol}${Math.round(abs).toLocaleString("en-US")}`;
  if (abs >= 0.1) return `${sign}${symbol}${abs.toFixed(2)}`;
  if (abs >= 0.01) return `${sign}${symbol}${Number(abs.toFixed(3))}`;
  return `${sign}${symbol}${abs.toFixed(5)}`;
};
const second = MODEL.display?.secondary;
const inSecond = (v) => (second ? `${second.symbol}${(v * second.perBase).toFixed(v * second.perBase < 10 ? 2 : 0)}` : "");
const signed = (v) => `<span class="${v >= 0 ? "pos" : "neg"}">${money(v)}</span>`;
const pct = (v) => (v === null ? "None" : `${Math.round(v * 100)}%`);
const count = (v) => (v < 10 && !Number.isInteger(v) ? v.toFixed(1) : Math.round(v).toLocaleString("en-US"));
const table = (id, head, rows) => {
  $(id).innerHTML = `<thead><tr>${head.map(([label, numeric]) => `<th scope="col"${numeric ? ' class="n"' : ""}>${esc(label)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody>`;
};
const stat = (label, value, note) => `<div class="stat"><em>${esc(label)}</em><b>${value}</b><span>${esc(note)}</span></div>`;
const cell = (v, numeric) => `<td${numeric ? ' class="n"' : ""}>${v}</td>`;
const row = (head, cells) => `<tr><th scope="row">${esc(head)}</th>${cells.join("")}</tr>`;

document.title = `${MODEL.product.name} unit economics`;
$("title").textContent = `${MODEL.product.name} unit economics`;
$("subtitle").textContent = `This page shows the cost of each unit and each customer. It also shows the money that you keep, and the price to charge. Calculated on ${MODEL.product.date}.`;
$("answer").textContent = MODEL.summary;

const primary = R.primary;
$("stats").innerHTML =
  R.units.slice(0, 2).map((u) => stat(`One ${u.label} costs`, money(u.average), `${second ? `${inSecond(u.average)}. ` : ""}${u.variants.length ? `The most expensive kind costs ${money(u.maximum)}.` : "This is the average cost."}`)).join("") +
  stat(`From one ${primary.name} customer, you keep`, money(primary.revenue.keep), "Each month, after tax and payment fees.") +
  stat(`Profit from one ${primary.name} customer`, money(primary.profit), `Each month. A normal customer costs ${money(primary.normal)}.`);

$("words").innerHTML = [
  ["Unit", "One thing that you can count, such as one customer or one action."],
  ...R.units.map((u) => [u.label[0].toUpperCase() + u.label.slice(1), u.definition]),
  ["Cost to serve", "The money that you pay to vendors when a customer uses the product."],
  ["Money you keep", "The price, less tax, payment fees, and refunds."],
  ["Profit", "Money you keep, less cost to serve. Salaries are not in this number."],
  ["Gross margin", "Profit as a percentage of the money you keep. Software companies aim for 80% to 90%."],
  ["Value", "The money that the product saves or earns for the customer each month."],
].map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join("");

$("customer-lead").textContent = `This is the average ${primary.name} customer across your markets. Normal use is ${Object.entries(primary.normal_usage ?? MODEL.plans.find((p) => p.key === primary.key).normal).map(([k, n]) => `${n} ${R.unitOf(k).plural}`).join(" and ")} each month.`;
const flow = [
  ["Customer pays", primary.revenue.pays, "pay"],
  ["Tax", primary.revenue.tax, "minus"],
  ["Payment fees", primary.revenue.fee, "minus"],
  ["Disputes and refunds", primary.revenue.loss, "minus"],
  ["Money you keep", primary.revenue.keep, "keep"],
  ["Cost to serve", primary.normal, "minus"],
  ["Profit", primary.profit, "keep"],
];
$("flow").innerHTML = flow.map(([label, value, kind]) => `<div class="flow-row"><span>${label}</span><span class="track"><span class="fill ${kind}" style="width:${(Math.max(0, value) / primary.revenue.pays) * 100}%"></span></span><strong>${kind === "minus" ? "-" : ""}${money(value)}</strong></div>`).join("");
table("markets", [["Market"], ["Customer pays", 1], ["Tax", 1], ["Payment fee", 1], ["You keep", 1], ["Share", 1]], primary.revenue.rows.map((r) => row(r.label, [cell(money(r.pays), 1), cell(money(r.tax), 1), cell(money(r.fee), 1), cell(money(r.keep), 1), cell(`${Math.round(r.share * 100)}%`, 1)])));

$("unit-tables").innerHTML = R.units.map((u) => {
  const biggest = Math.max(...u.lines.map((l) => l.cost), 1e-12);
  const lines = u.lines.map((l) => row(l.label, [cell(esc(l.vendor)), cell(`<span class="mini"><i style="width:${(l.cost / biggest) * 100}%"></i></span>`), cell(count(l.quantity), 1), cell(money(l.cost), 1)])).join("");
  const stored = u.storedPerMonth > 0 ? `<p class="small">Storage is separate. It costs ${money(u.storedPerMonth * R.retention)} over ${R.retention} months.</p>` : "";
  const baseTable = u.lines.length ? `<div class="panel scroll"><table><thead><tr><th scope="col">What you pay for</th><th scope="col">Vendor</th><th scope="col">Size</th><th class="n" scope="col">Quantity</th><th class="n" scope="col">Cost</th></tr></thead><tbody>${lines}<tr><th scope="row">Total</th><td></td><td></td><td></td><td class="n"><b>${money(u.base)}</b></td></tr></tbody></table></div>` : "";
  const variantTable = u.variants.length ? `<div class="panel scroll"><table><thead><tr><th scope="col">Kind</th><th scope="col">What it does</th><th class="n" scope="col">Share of use</th><th class="n" scope="col">Cost</th></tr></thead><tbody>${u.variants.map((v) => row(v.label, [cell(esc(v.does)), cell(`${Math.round(v.share * 100)}%`, 1), cell(money(v.cost), 1)])).join("")}<tr><th scope="row">Average</th><td></td><td></td><td class="n"><b>${money(u.average)}</b></td></tr></tbody></table></div>` : "";
  return `<h3>One ${esc(u.label)}: ${money(u.average)}</h3>${variantTable}${baseTable}${stored}`;
}).join("");

table("plans", [["Plan"], ["Normal use", 1], ["All limits", 1], ["Worst case", 1], ["You keep", 1], ["Gross margin: normal / limits / worst", 1]], R.plans.map((p) => row(p.name, [cell(money(p.normal), 1), cell(money(p.atLimits), 1), cell(money(p.worst), 1), cell(p.quoted ? `${money(p.revenue.keep)} at a quote of ${money(p.quote)}` : money(p.revenue.keep), 1), cell(p.free ? "None" : `${pct(p.marginNormal)} / ${pct(p.marginLimits)} / ${pct(p.marginWorst)}`, 1)])));
$("break-even").textContent = R.breakEven === null ? "" : `The average registered free user costs about ${money(R.freeAverage)} each month. You break even if about ${(R.breakEven * 100).toFixed(2)}% of users pay for ${primary.name}. Fixed costs are not in this number.`;

const V = MODEL.value;
const valueHidden = !V;
$("value-section").hidden = valueHidden;
if (V) {
  table("value", [["Customer"], ["Value each month", 1], ["One third of value", 1], ["Lowest price (cost at limits x 5)", 1], ["Price today", 1]], V.examples.map((e) => {
    const plan = R.planOf(e.plan);
    return row(e.label, [cell(money(R.valueOf(e)), 1), cell(money(R.valueOf(e) / 3), 1), cell(money(plan.floor), 1), cell(esc(plan.priceLabel), 1)]);
  }));
  const seed = V.examples[V.examples.length - 1];
  const fields = [["volume", `${V.volumeLabel} each month`], ["minutes", "Minutes saved on each one"], ["hourly", "Staff cost for one hour"], ["direct", "Other cost saved on each one"], ["revenueGain", "Extra revenue each month"]];
  $("value-inputs").innerHTML = fields.map(([key, label]) => `<label>${esc(label)}<input data-value="${key}" type="number" min="0" value="${seed[key] ?? 0}"></label>`).join("") +
    R.units.map((u) => `<label>${esc(u.plural[0].toUpperCase() + u.plural.slice(1))} each month<input data-use="${u.key}" type="number" min="0" value="${seed.usage?.[u.key] ?? 0}"></label>`).join("");
  const valueCalc = () => {
    const read = (el) => Math.max(0, Number(el.value) || 0);
    const input = {};
    document.querySelectorAll("[data-value]").forEach((el) => { input[el.dataset.value] = read(el); });
    const usage = {};
    document.querySelectorAll("[data-use]").forEach((el) => { usage[el.dataset.use] = read(el); });
    const value = R.valueOf(input);
    const cost = R.costOfUsage(usage);
    const floor = cost * 5;
    const price = value / 3;
    $("value-result").innerHTML =
      stat("Value to the customer", money(value), "Each month.") +
      stat("Price to quote", money(price), `One third. The range is ${money(value * 0.25)} to ${money(value * 0.5)}.`) +
      stat("Lowest price", money(floor), `Your cost is ${money(cost)}. ${price >= floor ? "The quote is above this floor." : "The quote is below this floor. Show more value or change the plan."}`);
  };
  document.querySelectorAll("#value-inputs input").forEach((el) => el.addEventListener("input", valueCalc));
  valueCalc();
}

table("competition", [["Competitor"], ["Plan"], ["Price"], ["Limit"]], (MODEL.competitors ?? []).map((c) => row(c.name, [cell(esc(c.plan)), cell(esc(c.price)), cell(esc(c.limit))])));
$("competition-section").hidden = !(MODEL.competitors ?? []).length;

$("sales-lead").textContent = `A salesperson must bring in about ${MODEL.sales?.multiple ?? 5} times their pay in new yearly revenue. For pay of ${money(MODEL.sales?.annualPay ?? 100000)} each year, that is ${money(R.salesTarget)}.`;
table("sales", [["Plan"], ["Revenue from one customer each year", 1], ["New customers for each salesperson each year", 1], ["Each working day", 1]], R.deals.map((d) => row(d.name, [cell(money(d.yearly), 1), cell(Math.ceil(d.perYear).toLocaleString("en-US"), 1), cell((d.perYear / 250).toFixed(1), 1)])));

const SIZES = MODEL.userCounts ?? [100, 1000, 10000, 1000000];
const scenarios = MODEL.scenarios;
const lead = scenarios[0];
table("scale", [["Users"], ["Paying", 1], ["You keep", 1], [`${lead.label} cost`, 1], [`${lead.label} profit`, 1], ...scenarios.slice(1).map((s) => [`${s.label} cost`, 1])], SIZES.map((users) => {
  const n = R.scenarioRow(users, lead);
  return row(users.toLocaleString("en-US"), [cell(count(n.paying), 1), cell(money(n.keep), 1), cell(money(n.total), 1), cell(signed(n.profit), 1), ...scenarios.slice(1).map((s) => cell(money(R.scenarioRow(users, s).total), 1))]);
}));
$("scale-note").textContent = scenarios.map((s) => `${s.label}: ${Math.round(s.payingShare * 100 * 10) / 10}% of users pay, ${Math.round(s.freeActive * 100)}% of free users are active.`).join(" ");
const middle = R.scenarioRow(10000, lead);
const vendors = Object.entries(middle.vendors).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);
table("vendors", [["Vendor at 10,000 users"], ["Cost each month", 1], ["Share of variable cost", 1]], vendors.map(([v, c]) => row(v, [cell(money(c), 1), cell(`${Math.round((c / (middle.total - R.fixed || 1)) * 100)}%`, 1)])));

const calc = () => {
  const n = (id) => Math.max(0, Number($(id).value) || 0);
  const r = R.scale({ users: Math.max(1, n("c-users")), payingShare: Math.min(100, n("c-paid")) / 100, freeActive: Math.min(100, n("c-active")) / 100, mix: MODEL.mix, usage: "normal", multiplier: n("c-mult") || 0 });
  $("calc-result").innerHTML = stat("Total cost each month", money(r.total), "Before salaries and support.") + stat("Money you keep each month", money(r.keep), `From ${count(r.paying)} paying customers.`) + stat("Profit each month", signed(r.profit), "Before salaries and support.");
};
$("c-paid").value = (MODEL.lowSales?.shares?.[0] ?? 0.01) * 100;
$("c-active").value = (MODEL.lowSales?.freeActive ?? 0.3) * 100;
["c-users", "c-paid", "c-active", "c-mult"].forEach((id) => $(id).addEventListener("input", calc));
calc();

$("tiers").innerHTML = R.paid.map((p) => `<article class="tier${p.highlight ? " pick" : ""}"><h3>${esc(p.name)}</h3><div class="price">${esc(p.priceLabel)}</div><div class="for">${esc(p.period ?? "")}</div><div class="for">${esc(p.who ?? "")}</div><ul>${(p.points ?? []).map((t) => `<li>${esc(t)}</li>`).join("")}</ul></article>`).join("");
$("free-row").innerHTML = R.free ? `<b>${esc(R.free.name)} is the way in.</b> ${esc(R.free.who ?? "")}` : "";
const token = (v) => ({ yes: '<span class="yes">Yes</span>', no: '<span class="no">No</span>', soon: '<span class="soon">Not built</span>' })[v] ?? esc(v);
$("matrix").innerHTML = `<thead><tr><th scope="col">Feature</th>${R.plans.map((p) => `<th scope="col">${esc(p.name)}</th>`).join("")}</tr></thead><tbody>` +
  (MODEL.features ?? []).map((group) => `<tr class="group"><th colspan="${R.plans.length + 1}" scope="colgroup">${esc(group.group)}</th></tr>${group.rows.map(([label, ...cells]) => `<tr><th scope="row">${esc(label)}</th>${cells.map((c) => `<td>${token(c)}</td>`).join("")}</tr>`).join("")}`).join("") + "</tbody>";

const low = MODEL.lowSales ?? { shares: [0.01, 0.005], freeActive: 0.3 };
$("low-lead").textContent = `This table uses the customer mix in the model. ${R.paid.filter((p) => p.quoted).length ? "Customers on a quoted plan are not included." : ""}`;
const lowRow = (users, share) => R.scale({ users, payingShare: share, freeActive: low.freeActive, mix: low.mix ?? MODEL.mix, usage: "normal" });
table("few", [["Users"], ...low.shares.flatMap((s) => [[`Paying at ${s * 100}%`, 1], [`Cost at ${s * 100}%`, 1], [`Profit at ${s * 100}%`, 1]])], SIZES.map((users) => row(users.toLocaleString("en-US"), low.shares.flatMap((s) => {
  const r = lowRow(users, s);
  return [cell(count(r.paying), 1), cell(money(r.total), 1), cell(signed(r.profit), 1)];
}))));
const goals = [{ label: "Pay the fixed bills", amount: R.fixed }, ...(MODEL.goals ?? [])];
table("needed", [["Goal"], ["Money each month", 1], ...R.paid.map((p) => [p.quoted ? `${p.name} at ${money(p.quote)}` : p.name, 1])], goals.map((g) => row(g.label, [cell(money(g.amount), 1), ...R.paid.map((p) => cell(p.profit > 0 ? Math.ceil(g.amount / p.profit).toLocaleString("en-US") : "None", 1))])));

const STATUS = { pass: ["Pass", "m"], warn: ["Check", "e"], fail: ["Problem", "a"] };
table("checks", [["Check"], ["Result"], ["Detail"]], R.checks.map((c) => row(c.label, [cell(`<span class="tag ${STATUS[c.status][1]}">${STATUS[c.status][0]}</span>`), cell(esc(c.detail))])));
$("recommendations").innerHTML = (MODEL.recommendations ?? []).map((r) => `<li><b>${esc(r.title)}</b> ${esc(r.detail)}</li>`).join("");
const TAG = { measured: ["Measured", "m"], vendor: ["Vendor price", "v"], estimate: ["Estimate", "e"], assumption: ["Assumption", "a"] };
table("trust", [["Number"], ["Type"], ["Where it comes from"]], (MODEL.evidence ?? []).map((e) => row(e.what, [cell(`<span class="tag ${TAG[e.type][1]}">${TAG[e.type][0]}</span>`), cell(esc(e.source))])));
$("excluded").textContent = MODEL.excluded ?? "Not in these numbers: salaries, customer support, and income tax.";
$("sources").innerHTML = (MODEL.sources ?? []).map((s) => `<li>${s.url ? `<a href="${esc(s.url)}">${esc(s.label)}</a>` : esc(s.label)}</li>`).join("");
