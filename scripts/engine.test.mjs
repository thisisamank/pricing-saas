import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compute } from "../assets/engine.js";
import { build, validate } from "./build.mjs";

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} is not ${b}`);
const base = () => ({
  product: { name: "T", date: "d" },
  summary: "s",
  primaryPlan: "paid",
  retentionMonths: 10,
  meters: {
    mail: { label: "Mail", vendor: "V1", free: 100, rate: 0.01 },
    event: { label: "Event", vendor: "V2", tiers: [[10, 0], [10, 0.5], [null, 0.1]] },
    disk: { label: "Disk", vendor: "V3", rate: 1, accumulate: true },
    token: { label: "Token", vendor: "V4", rate: 0.001 },
  },
  units: [
    { key: "send", label: "send", plural: "sends", definition: "d", uses: { mail: 2, disk: 0.5 } },
    { key: "ai", label: "ai", plural: "ais", definition: "d", variants: [
      { key: "big", label: "B", does: "d", share: 0.25, uses: { token: 1000 } },
      { key: "mid", label: "M", does: "d", share: 0.25, uses: { token: 100 } },
      { key: "low", label: "L", does: "d", share: 0.5, uses: { token: 10 } },
    ] },
  ],
  perActiveUser: { event: 1 },
  fixedCosts: [{ label: "F", monthly: 7 }],
  revenue: { lossPerCustomer: 0.5, markets: [
    { key: "a", label: "A", share: 0.5, perBase: 1, taxRate: 0.25, feePct: 0.1, feeFixed: 1 },
    { key: "b", label: "B", share: 0.5, perBase: 10, taxRate: 0, feePct: 0, feeFixed: 0 },
  ] },
  plans: [
    { key: "free", name: "Free", free: true, normal: { send: 1, ai: 1 }, limits: { send: 2, ai: 2 } },
    { key: "paid", name: "Paid", priceLabel: "$20", listPrice: 20, prices: { a: 20, b: 200 }, normal: { send: 10, ai: 4 }, limits: { send: 20, ai: 10 }, variantLimits: { ai: { big: 2 } } },
    { key: "quote", name: "Quote", quoted: true, quote: 100, keepShare: 0.8, priceLabel: "C", listPrice: 80, normal: { send: 1 }, limits: { send: 1 } },
  ],
  mix: { paid: 1 },
  scenarios: [{ label: "N", payingShare: 0.1, freeActive: 0.5, usage: "normal" }],
});

test("unit costs use list rates and ignore stored meters", () => {
  const r = compute(base());
  close(r.unitOf("send").base, 0.02);
  close(r.unitOf("send").storedPerMonth, 0.5);
  close(r.unitOf("ai").maximum, 1);
  close(r.unitOf("ai").average, 0.25 + 0.025 + 0.005);
  assert.deepEqual(r.unitOf("ai").variants.map((v) => v.key), ["big", "mid", "low"]);
});

test("money kept removes tax, fees and losses by market share", () => {
  const paid = compute(base()).planOf("paid");
  close(paid.revenue.pays, 20);
  close(paid.revenue.tax, 2);
  close(paid.revenue.fee, 1.5);
  close(paid.revenue.keep, 16);
  close(compute(base()).planOf("quote").revenue.keep, 80);
});

test("the worst case fills the expensive variant up to its limit", () => {
  const r = compute(base());
  close(r.planOf("paid").worst, 20 * 0.02 + 2 * 1 + 8 * 0.1);
  close(r.planOf("paid").atLimits, 20 * 0.02 + 10 * 0.28);
  const noLimit = base();
  delete noLimit.plans[1].variantLimits;
  close(compute(noLimit).planOf("paid").worst, 20 * 0.02 + 10 * 1);
});

test("the forecast applies free amounts, tiers, storage and fixed costs", () => {
  const r = compute(base());
  const s = r.scale({ users: 100, payingShare: 0.1, freeActive: 0.5, mix: { paid: 1 }, usage: "normal" });
  assert.equal(s.paying, 10);
  close(s.counts.send, 45 + 100);
  close(s.vendors.V1, Math.max(0, 290 - 100) * 0.01);
  close(s.vendors.V2, 10 * 0.5 + 35 * 0.1);
  close(s.vendors.V3, 145 * 0.5 * 10);
  close(s.keep, 160);
  close(s.total, Object.values(s.vendors).reduce((a, b) => a + b, 0) + 7);
});

test("checks report a large price step and a weak worst case", () => {
  const model = base();
  model.plans[2].listPrice = 500;
  model.plans[1].variantLimits = undefined;
  model.plans[1].limits.ai = 200;
  const checks = compute(model).checks;
  assert.equal(checks.find((c) => c.label.startsWith("Step from Paid")).status, "warn");
  assert.equal(checks.find((c) => c.label === "Paid: gross margin in the worst case").status, "fail");
});

test("validate names each problem in a model", () => {
  assert.deepEqual(validate(base()), []);
  const bad = base();
  bad.units[0].uses.nope = 1;
  bad.revenue.markets[0].share = 0.9;
  bad.plans[1].prices = { a: 1 };
  bad.primaryPlan = "gone";
  const errors = validate(bad).join(" ");
  for (const text of ["nope", "Market shares", 'market "b"', "gone"]) assert.ok(errors.includes(text), text);
  assert.match(validate({}).join(" "), /Missing "product"/);
});

test("the page has no empty placeholders and keeps model text out of the script tag", () => {
  const model = base();
  model.summary = "</script><img src=x onerror=alert(1)>";
  const html = build(model);
  for (const mark of ["__MODEL__", "__ENGINE__", "__RENDER__", "export function"]) assert.ok(!html.includes(mark), mark);
  assert.ok(!html.includes("</script><img"));
});

test("the example model is valid", () => {
  const model = JSON.parse(readFileSync(new URL("../examples/form-builder.model.json", import.meta.url)));
  assert.deepEqual(validate(model), []);
  assert.ok(compute(model).units.length === 2);
});
