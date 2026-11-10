# Pricing method

Part of this method comes from the Y Combinator talk "How To Price For B2B".

## The three checks

Do these checks in this order.

1. **Value.** Write down the money that the product saves or earns for the customer. Use time saved, cost saved, or revenue gained. Charge 25% to 50% of it, and about one third is a good start.
2. **Cost.** Cost is only the floor. Never start from cost. Keep a gross margin of 80% to 90%. If one third of the value is below the cost, the product needs more value or a different design.
3. **Competition.** Find what the customer can buy instead. Do not start a price war. Make the product different.

## Design the tiers

Use one or two cheap plans, and one Enterprise plan. A free plan is optional.

- **Free:** Make it useful, and make it cheap for you. Limit the expensive actions first.
- **Individual plan:** Give the features that one person or a small company needs.
- **Small-team plan:** Limit people and volume.
- **Enterprise:** Unlimited use, and features that only large companies need.

Keep features for Enterprise that small customers do not need and large companies must have. Examples are single sign-on, audit logs, compliance reports, security reviews, and data location. Companies can pay up to 10 times more for these. Mark a feature as `soon` if it does not exist.

Keep the pricing simple. Complex pricing stops sales.

## Set limits

- Limit the action that costs the most. Use `variantLimits` to cap the expensive variant.
- If an action costs almost nothing, set its limit for sales reasons. Do not pretend that the limit is for cost.
- Check the steps between plans. If one price is more than about 6 times the plan below it, customers leave at that step.
- Prefer a fixed monthly or yearly price to pure usage pricing. Customers fear uncapped bills, and committed revenue is safer.

## Enterprise

- Do not publish the price. The value is different for each customer.
- Write the value calculation with the customer. Ask the customer to check each number.
- Quote one third of the value. Never go below 5 times the cost for that customer.
- Set a minimum price.
- If you do not know the value, start with a number close to other software that the customer buys. Add 50% for each new customer. Stop when you lose more than 25% of deals because of price.
- Ask how much the buyer can approve without a manager. Keep the first price under that amount if you can.
- Sell a yearly contract with a 30-day or 60-day money-back guarantee. Keep a pilot to 4 weeks or less, with a clear result to measure.
- A small company can offer what large vendors cannot: the phone number of a founder.

## Sales channel

A salesperson must bring in about 5 times their pay in new yearly revenue. Use this to find which plans can pay for sales. A cheap plan must sell itself through the website.

## When few users pay

Assume that very few users pay until real data shows otherwise.

- Each paying customer must bring more money, so do not price too low.
- Free users must cost less, so limit the expensive actions on Free.
- Spend sales time on the customers who bring the most profit.
- Fixed payment fees hurt most at low prices. Yearly plans pay the fixed fee one time.

## After launch

Do not spend too long on the first price. The first customers are a small part of future revenue. Pick a price, sell, and review it after you have 30 days of real cost data. If almost every customer says yes, the price is too low.

## Write the recommendations

Each recommendation has a short imperative title and one or two sentences with a number. Include scale limits, features that are not built, and decisions that the user must make.
