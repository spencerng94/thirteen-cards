export interface Challenge {
  id: string;
  title: string;
  description: string;
  target: number;
  rewardType: 'GOLD' | 'XP' | 'BOOSTER';
  rewardValue: number | string;
  metric: 'wins' | 'games' | 'bombs' | 'chops' | 'low_rank_win' | 'no_pass_win';
}

export const CHALLENGE_POOL: Challenge[] = [
  { id: 'ch_underdog', title: 'The Underdog', description: 'Secure a win where your final card rank is ≤ 7.', target: 2, rewardType: 'GOLD', rewardValue: 400, metric: 'low_rank_win' },
  { id: 'ch_firecracker', title: 'The Firecracker', description: 'Deploy 5 Bombs or Quads in total.', target: 5, rewardType: 'XP', rewardValue: 100, metric: 'bombs' },
  { id: 'ch_counter', title: 'The Counter-Punch', description: 'Perform 3 successful Chops on 2s.', target: 3, rewardType: 'GOLD', rewardValue: 500, metric: 'chops' },
  { id: 'ch_marathon', title: 'Arena Marathon', description: 'Complete 15 match deployments.', target: 15, rewardType: 'GOLD', rewardValue: 300, metric: 'games' },
  { id: 'ch_clean_sweep', title: 'Clean Sweep', description: 'Win 5 matches without passing once in the final round.', target: 5, rewardType: 'BOOSTER', rewardValue: 'XP_2X_30M', metric: 'no_pass_win' },
  { id: 'ch_assassin', title: 'Quiet Assassin', description: 'Win a match where you never played a Triple or higher.', target: 3, rewardType: 'XP', rewardValue: 150, metric: 'wins' },
  { id: 'ch_dominance', title: 'Total Dominance', description: 'Win 10 matches in the arena.', target: 10, rewardType: 'GOLD', rewardValue: 1000, metric: 'wins' },
  { id: 'ch_demolition', title: 'Demolition Specialist', description: 'Play 10 Bombs or Quads.', target: 10, rewardType: 'XP', rewardValue: 250, metric: 'bombs' },
  { id: 'ch_heavy_hitter', title: 'Heavy Hitter', description: 'Win with a card rank of Ace or higher.', target: 8, rewardType: 'GOLD', rewardValue: 600, metric: 'wins' },
  { id: 'ch_fast_track', title: 'Fast Track', description: 'Complete 25 games.', target: 25, rewardType: 'BOOSTER', rewardValue: 'GOLD_2X_30M', metric: 'games' },
  { id: 'ch_sniper', title: 'The Sniper', description: 'Chop a single 2 using a Quad.', target: 2, rewardType: 'GOLD', rewardValue: 450, metric: 'chops' },
  { id: 'ch_resilience', title: 'Resilience', description: 'Play 50 games in total.', target: 50, rewardType: 'XP', rewardValue: 500, metric: 'games' },
  { id: 'ch_legend', title: 'Arena Legend', description: 'Secure 20 wins.', target: 20, rewardType: 'GOLD', rewardValue: 2000, metric: 'wins' },
  { id: 'ch_tactician', title: 'The Tactician', description: 'Successfully chop 5 times.', target: 5, rewardType: 'XP', rewardValue: 300, metric: 'chops' },
  { id: 'ch_survivor', title: 'The Survivor', description: 'Win 3 games with exactly 1 card left in an opponent\'s hand.', target: 3, rewardType: 'GOLD', rewardValue: 700, metric: 'wins' },
];

function getISOWeek(date: Date) {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

export const getWeeklyChallenges = (): Challenge[] => {
  const now = new Date();
  const seed = now.getFullYear() * 100 + getISOWeek(now);
  
  // Deterministic "Random" sort
  const shuffled = [...CHALLENGE_POOL].sort((a, b) => {
    const hashA = Math.sin(seed + a.id.length) * 10000;
    const hashB = Math.sin(seed + b.id.length) * 10000;
    return hashA - hashB;
  });

  return shuffled.slice(0, 3);
};

export const getTimeUntilReset = (): string => {
  const now = new Date();
  const nextMonday = new Date();
  nextMonday.setDate(now.getDate() + (1 + 7 - now.getDay()) % 7 || 7);
  nextMonday.setHours(0, 0, 0, 0);
  
  const diff = nextMonday.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  
  return `${days}D ${hours}H`;
};