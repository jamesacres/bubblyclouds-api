export enum SudokuQQWingDifficulty {
  SIMPLE = 'simple',
  EASY = 'easy',
  INTERMEDIATE = 'intermediate',
  EXPERT = 'expert',
}

/**
 * Unblock race difficulty bands, derived from the minimum number of moves
 * required to solve a puzzle.
 */
export enum UnblockRaceDifficulty {
  /** 1-15 moves */
  BEGINNER = 'beginner',
  /** 16-20 moves */
  CHALLENGING = 'challenging',
  /** 21-30 moves */
  HARD = 'hard',
  /** 31+ moves */
  EXPERT = 'expert',
}

export enum SudokuCoachPuzzleDifficulty {
  VERY_EASY = '1-very-easy',
  EASY = '2-easy',
  MODERATELY_EASY = '3-moderately-easy',
  MODERATE = '4-moderate',
  MODERATELY_HARD = '5-moderately-hard',
  HARD = '6-hard',
  VICIOUS = '7-vicious',
  FIENDISH = '8-fiendish',
  DEVILISH = '9-devilish',
  HELL = '10-hell',
  BEYOND_HELL = '11-beyond-hell',
}
