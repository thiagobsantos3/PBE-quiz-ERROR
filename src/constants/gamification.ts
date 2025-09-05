/**
 * Gamification constants for XP, levels, and achievements
 */

// XP required to advance to the next level
export const XP_PER_LEVEL = 500;

// Level calculation helper
export function calculateLevel(totalXp: number): number {
  return Math.floor(totalXp / XP_PER_LEVEL) + 1;
}

// XP progress calculation helper
export function calculateXpProgress(totalXp: number, currentLevel: number) {
  const currentLevelXp = (currentLevel - 1) * XP_PER_LEVEL;
  const nextLevelXp = currentLevel * XP_PER_LEVEL;
  const currentXpInLevel = totalXp - currentLevelXp;
  const xpNeededForNext = nextLevelXp - totalXp;
  const percentage = (currentXpInLevel / XP_PER_LEVEL) * 100;
  
  return {
    current: currentXpInLevel,
    needed: xpNeededForNext,
    percentage: Math.min(percentage, 100)
  };
}