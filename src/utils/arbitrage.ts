export type ArbitrageCalc = {
  hasArbitrage: boolean;
  arbIndex: number;
  profitPercent: number;
};

export function computeArbitrage(oddA: number, oddB: number): ArbitrageCalc {
  if (!oddA || !oddB || oddA <= 1 || oddB <= 1) {
    return { hasArbitrage: false, arbIndex: 0, profitPercent: 0 };
  }

  const arbIndex = 1 / oddA + 1 / oddB;
  const profitPercent = (1 - arbIndex) * 100;

  return {
    hasArbitrage: arbIndex < 1,
    arbIndex,
    profitPercent,
  };
}

export type StakeSplit = {
  payout: number;
  stakeA: number;
  stakeB: number;
  profit: number;
  profitPercent: number;
};

export function computeStakeSplit(
  total: number,
  oddA: number,
  oddB: number
): StakeSplit {
  const invSum = 1 / oddA + 1 / oddB;
  const payout = total / invSum;
  const stakeA = payout / oddA;
  const stakeB = payout / oddB;
  const profit = payout - total;
  const profitPercent = (profit / total) * 100;

  return {
    payout,
    stakeA,
    stakeB,
    profit,
    profitPercent,
  };
}

export function calculateImpliedProbability(odd: number): number {
  if (!odd || odd <= 1) return 0;
  return (1 / odd) * 100;
}

export function calculateCombinedOdds(odds: number[]): number {
  if (odds.length === 0) return 0;
  return odds.reduce((acc, odd) => acc * odd, 1);
}

export function calculateJointProbability(odds: number[]): number {
  if (odds.length === 0) return 0;
  const probs = odds.map(odd => calculateImpliedProbability(odd) / 100);
  return probs.reduce((acc, p) => acc * p, 1) * 100;
}
