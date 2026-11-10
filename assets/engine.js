export function compute(model) {
  const meterOf = (key) => model.meters[key];
  const tiersOf = (m) => (m.tiers ? m.tiers.map(([size, rate]) => [size ?? Infinity, rate]) : [[m.free ?? 0, 0], [Infinity, m.rate]]);
  const listRate = (m) => tiersOf(m).find(([, rate]) => rate > 0)?.[1] ?? 0;
  const billed = (m, quantity) => {
    let left = quantity;
    let cost = 0;
    for (const [size, rate] of tiersOf(m)) {
      const used = Math.min(left, size);
      cost += used * rate;
      left -= used;
      if (left <= 0) break;
    }
    return cost;
  };
  const usesCost = (uses = {}, stored = false) =>
    Object.entries(uses).reduce((sum, [key, n]) => (Boolean(meterOf(key).accumulate) === stored ? sum + n * listRate(meterOf(key)) : sum), 0);

  const units = model.units.map((unit) => {
    const base = usesCost(unit.uses);
    const variants = (unit.variants ?? []).map((v) => ({ ...v, cost: base + usesCost(v.uses) })).sort((a, b) => b.cost - a.cost);
    const average = variants.length ? variants.reduce((sum, v) => sum + v.cost * v.share, 0) : base;
    const lines = Object.entries(unit.uses ?? {})
      .filter(([key]) => !meterOf(key).accumulate)
      .map(([key, n]) => ({ label: meterOf(key).label, vendor: meterOf(key).vendor, quantity: n, cost: n * listRate(meterOf(key)) }))
      .sort((a, b) => b.cost - a.cost);
    return { ...unit, base, average, maximum: variants.length ? variants[0].cost : base, variants, lines, storedPerMonth: usesCost(unit.uses, true) };
  });
  const unitOf = (key) => units.find((u) => u.key === key);
  const plansRaw = model.plans;
  const planOf = (key) => plansRaw.find((p) => p.key === key);
  const lossPerCustomer = model.revenue.lossPerCustomer ?? 0;

  const marketRows = (plan) =>
    model.revenue.markets.map((m) => {
      const local = plan.prices[m.key];
      const pays = local / m.perBase;
      const tax = pays - pays / (1 + m.taxRate);
      const fee = pays * m.feePct + m.feeFixed;
      return { ...m, pays, tax, fee, keep: pays - tax - fee };
    });
  const weighted = (rows, key) => rows.reduce((sum, r) => sum + r[key] * r.share, 0);
  const revenueOf = (plan) => {
    if (plan.free) return { pays: 0, tax: 0, fee: 0, loss: 0, keep: 0, rows: [] };
    if (plan.quoted) return { pays: plan.quote, tax: 0, fee: 0, loss: 0, keep: plan.quote * plan.keepShare, rows: [] };
    const rows = marketRows(plan);
    const pays = weighted(rows, "pays");
    const tax = weighted(rows, "tax");
    const fee = weighted(rows, "fee");
    return { pays, tax, fee, loss: lossPerCustomer, keep: pays - tax - fee - lossPerCustomer, rows };
  };
  const usageCost = (usage = {}) => Object.entries(usage).reduce((sum, [key, n]) => sum + n * unitOf(key).average, 0);
  const worstCost = (plan) =>
    units.reduce((sum, unit) => {
      const count = plan.limits[unit.key] ?? 0;
      if (!unit.variants.length) return sum + count * unit.base;
      let remaining = count;
      let cost = 0;
      for (const v of unit.variants) {
        const n = Math.min(remaining, plan.variantLimits?.[unit.key]?.[v.key] ?? Infinity);
        cost += n * v.cost;
        remaining -= n;
      }
      return sum + cost;
    }, 0);

  const plans = plansRaw.map((plan) => {
    const revenue = revenueOf(plan);
    const normal = usageCost(plan.normal);
    const atLimits = usageCost(plan.limits);
    const worst = worstCost(plan);
    const margin = (cost) => (revenue.keep > 0 ? (revenue.keep - cost) / revenue.keep : null);
    return { ...plan, revenue, normal, atLimits, worst, marginNormal: margin(normal), marginLimits: margin(atLimits), marginWorst: margin(worst), profit: revenue.keep - normal, floor: atLimits * 5 };
  });
  const computed = (key) => plans.find((p) => p.key === key);
  const free = plans.find((p) => p.free);
  const freeUsage = plansRaw.find((p) => p.free);
  const paid = plans.filter((p) => !p.free);
  const fixed = (model.fixedCosts ?? []).reduce((sum, c) => sum + c.monthly, 0);
  const retention = model.retentionMonths ?? 12;

  function scale({ users, payingShare, freeActive, mix, usage = "normal", multiplier = 1 }) {
    const paying = users * payingShare;
    const activeFree = (users - paying) * freeActive;
    const active = activeFree + paying;
    const usageOf = (plan) => (usage === "limits" ? plan.limits : plan[usage] ?? plan.normal);
    const counts = Object.fromEntries(
      units.map((u) => [u.key, multiplier * (activeFree * (usageOf(freeUsage)[u.key] ?? 0) + Object.entries(mix).reduce((sum, [key, share]) => sum + paying * share * (usageOf(planOf(key))[u.key] ?? 0), 0))]),
    );
    const totals = {};
    const add = (uses = {}, times = 1) => {
      for (const [key, n] of Object.entries(uses)) totals[key] = (totals[key] ?? 0) + n * times;
    };
    for (const u of units) {
      add(u.uses, counts[u.key]);
      for (const v of u.variants) add(v.uses, counts[u.key] * v.share);
    }
    add(model.perActiveUser, active);
    add(model.perRegisteredUser, users);
    const vendors = {};
    for (const [key, quantity] of Object.entries(totals)) {
      const meter = meterOf(key);
      const cost = billed(meter, meter.accumulate ? quantity * retention : quantity);
      vendors[meter.vendor] = (vendors[meter.vendor] ?? 0) + cost;
    }
    const variable = Object.values(vendors).reduce((a, b) => a + b, 0);
    const total = variable + fixed;
    const keep = paying * Object.entries(mix).reduce((sum, [key, share]) => sum + share * computed(key).revenue.keep, 0);
    return { users, paying, counts, vendors, total, keep, profit: keep - total };
  }

  const scenarioRow = (users, scenario) => scale({ users, payingShare: scenario.payingShare, freeActive: scenario.freeActive, mix: scenario.mix ?? model.mix, usage: scenario.usage });
  const valueOf = ({ volume = 0, minutes = 0, hourly = 0, direct = 0, revenueGain = 0 }) => volume * ((minutes / 60) * hourly + direct) + revenueGain;
  const costOfUsage = usageCost;
  const freeAverage = free ? (model.lowSales?.freeActive ?? 0.3) * free.normal : 0;
  const primary = computed(model.primaryPlan);
  const breakEven = primary.profit > 0 ? freeAverage / (primary.profit + freeAverage) : null;

  const checks = [];
  const add = (status, label, detail) => checks.push({ status, label, detail });
  const percent = (v) => `${Math.round(v * 100)}%`;
  for (const p of paid) {
    if (p.marginNormal !== null) add(p.marginNormal >= 0.8 ? "pass" : "fail", `${p.name}: gross margin in normal use`, `${percent(p.marginNormal)}. The target is 80% or more.`);
    if (p.marginLimits !== null) add(p.marginLimits >= 0.7 ? "pass" : "warn", `${p.name}: gross margin at all limits`, `${percent(p.marginLimits)}. The target is 70% or more.`);
    if (p.marginWorst !== null) add(p.marginWorst >= 0.5 ? "pass" : "fail", `${p.name}: gross margin in the worst case`, `${percent(p.marginWorst)}. The target is 50% or more. If it is lower, add a limit on the most expensive action.`);
    add(p.revenue.keep >= p.floor ? "pass" : "warn", `${p.name}: money kept is above the lowest price`, `You keep ${p.revenue.keep.toFixed(2)}. The lowest price is ${p.floor.toFixed(2)}, which is the cost at limits times 5.`);
  }
  const ladder = paid.filter((p) => p.listPrice > 0);
  for (let i = 1; i < ladder.length; i++) {
    const ratio = ladder[i].listPrice / ladder[i - 1].listPrice;
    add(ratio <= 6 ? "pass" : "warn", `Step from ${ladder[i - 1].name} to ${ladder[i].name}`, `The price goes up ${ratio.toFixed(1)} times. Above 6 times, customers often leave at the step.`);
  }
  for (const example of model.value?.examples ?? []) {
    const plan = computed(example.plan);
    const third = valueOf(example) / 3;
    const price = plan.listPrice;
    if (!price) continue;
    add(price <= third * 1.5 ? "pass" : "warn", `${example.label}: price against value`, `One third of the value is ${third.toFixed(2)}. The price is ${price.toFixed(2)}.${price < third * 0.5 ? " You have room to raise the price." : ""}`);
  }
  if (breakEven !== null) add(breakEven <= (model.lowSales?.shares?.[0] ?? 0.01) ? "pass" : "fail", "Paying users cover free users", `You break even when ${(breakEven * 100).toFixed(2)}% of users pay. The low-sales case assumes ${percent(model.lowSales?.shares?.[0] ?? 0.01)}.`);
  const salesTarget = (model.sales?.annualPay ?? 100000) * (model.sales?.multiple ?? 5);
  const deals = paid.filter((p) => p.listPrice > 0).map((p) => ({ name: p.name, yearly: p.listPrice * 12, perYear: salesTarget / (p.listPrice * 12) }));

  return { units, unitOf, plans, planOf: computed, free, paid, primary, fixed, retention, scale, scenarioRow, valueOf, costOfUsage, freeAverage, breakEven, checks, deals, salesTarget };
}
