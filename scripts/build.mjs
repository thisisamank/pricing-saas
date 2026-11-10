#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compute } from "../assets/engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const assets = join(here, "..", "assets");

export function validate(model) {
  const errors = [];
  const need = (cond, message) => { if (!cond) errors.push(message); };
  for (const key of ["product", "meters", "units", "plans", "revenue", "mix", "scenarios", "primaryPlan", "summary"]) need(model[key] !== undefined, `Missing "${key}".`);
  if (errors.length) return errors;
  need(Boolean(model.product.name && model.product.date), "product needs name and date.");
  const meterKey = (where, uses = {}) => Object.keys(uses).forEach((k) => need(model.meters[k], `${where} uses unknown meter "${k}".`));
  for (const [key, m] of Object.entries(model.meters)) {
    need(m.label && m.vendor, `Meter "${key}" needs label and vendor.`);
    need(Array.isArray(m.tiers) || typeof m.rate === "number", `Meter "${key}" needs rate or tiers.`);
  }
  const close = (a, b) => Math.abs(a - b) < 0.001;
  for (const u of model.units) {
    need(u.key && u.label && u.plural && u.definition, `Each unit needs key, label, plural and definition. Check "${u.key ?? u.label}".`);
    meterKey(`Unit "${u.key}"`, u.uses);
    if (u.variants?.length) {
      need(close(u.variants.reduce((s, v) => s + v.share, 0), 1), `Unit "${u.key}" variant shares must add up to 1.`);
      u.variants.forEach((v) => meterKey(`Variant "${v.key}"`, v.uses));
    }
  }
  meterKey("perActiveUser", model.perActiveUser);
  meterKey("perRegisteredUser", model.perRegisteredUser);
  need(close(model.revenue.markets.reduce((s, m) => s + m.share, 0), 1), "Market shares must add up to 1.");
  need(model.plans.filter((p) => p.free).length === 1, "Exactly one plan needs free: true.");
  const keys = new Set(model.plans.map((p) => p.key));
  need(keys.has(model.primaryPlan), `primaryPlan "${model.primaryPlan}" does not exist.`);
  const unitKeys = new Set(model.units.map((u) => u.key));
  for (const p of model.plans) {
    need(p.limits && p.normal, `Plan "${p.key}" needs limits and normal.`);
    for (const k of Object.keys({ ...p.limits, ...p.normal })) need(unitKeys.has(k), `Plan "${p.key}" uses unknown unit "${k}".`);
    if (!p.free && !p.quoted) model.revenue.markets.forEach((m) => need(typeof p.prices?.[m.key] === "number", `Plan "${p.key}" needs a price for market "${m.key}".`));
    if (p.quoted) need(p.quote > 0 && p.keepShare > 0, `Quoted plan "${p.key}" needs quote and keepShare.`);
    if (!p.free) need(p.priceLabel, `Plan "${p.key}" needs priceLabel.`);
  }
  const mixCheck = (where, mix) => {
    need(close(Object.values(mix).reduce((a, b) => a + b, 0), 1), `${where} shares must add up to 1.`);
    Object.keys(mix).forEach((k) => need(keys.has(k), `${where} uses unknown plan "${k}".`));
  };
  mixCheck("mix", model.mix);
  if (model.lowSales?.mix) mixCheck("lowSales.mix", model.lowSales.mix);
  for (const g of model.features ?? []) for (const row of g.rows) need(row.length === model.plans.length + 1, `Feature "${row[0]}" needs one value for each plan.`);
  for (const e of model.evidence ?? []) need(["measured", "vendor", "estimate", "assumption"].includes(e.type), `Evidence "${e.what}" has a bad type.`);
  for (const e of model.value?.examples ?? []) need(keys.has(e.plan), `Value example "${e.label}" uses unknown plan "${e.plan}".`);
  return errors;
}

export function build(model) {
  const safe = JSON.stringify(model).replace(/</g, "\\u003c");
  const engine = readFileSync(join(assets, "engine.js"), "utf8").replace("export function compute", "function compute");
  const render = readFileSync(join(assets, "render.js"), "utf8");
  return readFileSync(join(assets, "template.html"), "utf8").replace("/*__MODEL__*/null", () => safe).replace("/*__ENGINE__*/", () => engine).replace("/*__RENDER__*/", () => render);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [input, output = "docs/pricing/unit-economics.html"] = process.argv.slice(2);
  if (!input) {
    console.error("Usage: build.mjs <pricing-model.json> [output.html]");
    process.exit(2);
  }
  const model = JSON.parse(readFileSync(input, "utf8"));
  const errors = validate(model);
  if (errors.length) {
    console.error(`The model has ${errors.length} problem(s):\n- ${errors.join("\n- ")}`);
    process.exit(1);
  }
  mkdirSync(dirname(resolve(output)), { recursive: true });
  writeFileSync(output, build(model));
  const result = compute(model);
  console.log(`Wrote ${output}`);
  for (const u of result.units) console.log(`One ${u.label}: $${u.average.toFixed(5)}`);
  for (const p of result.plans) console.log(`${p.name}: keep $${p.revenue.keep.toFixed(2)}, normal $${p.normal.toFixed(2)}, limits $${p.atLimits.toFixed(2)}, worst $${p.worst.toFixed(2)}`);
  console.log("Checks:");
  for (const c of result.checks) console.log(`  [${c.status}] ${c.label}: ${c.detail}`);
}
