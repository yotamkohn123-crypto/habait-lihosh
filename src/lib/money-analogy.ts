const PIZZA_PRICE = 50;
const MIN_AMOUNT_FOR_ANALOGY = 100;

export function moneyAnalogy(amount: number): string | null {
  if (amount < MIN_AMOUNT_FOR_ANALOGY) return null;
  const pizzas = Math.round(amount / PIZZA_PRICE);
  if (pizzas < 1) return null;
  return `זה בערך כמו ${pizzas} פיצות`;
}
