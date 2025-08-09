import { SudokuCoachPuzzleDifficulty } from '@/types/enums/difficulty.enum';

export interface SudokuBookPuzzle {
  initial: string;
  final: string;
  difficulty: {
    coach: SudokuCoachPuzzleDifficulty; // https://sudoku.coach
    sudokuExplainer: number; // https://github.com/SudokuMonster/SukakuExplainer
    hoDoKu: number; // https://hodoku.sourceforge.net
    tediousPercent: number; // TediousnessPercentage
    count: {
      givens: number;
      basic: number;
      simple: number;
      advanced: number;
      moreAdvanced: number;
      hard: number;
      brutal: number;
    };
  };
  techniques: Partial<{
    basic: Partial<{
      lastDigit: number;
      hiddenSingleBox: number;
      hiddenSingleLine: number;
      hiddenSingleVariantRegion: number;
      nakedSingle: number;
    }>;
    simple: Partial<{
      hiddenPair: number;
      lockedCandidate: number;
      hiddenTriple: number;
      hiddenQuadruple: number;
      nakedPair: number;
      nakedTriple: number;
      nakedQuadruple: number;
    }>;
    advanced: Partial<{
      xWing: number;
      swordfish: number;
      skyscraper: number;
      twoStringKite: number;
      crane: number;
      simpleColoring: number;
      yWing: number;
      xYZWing: number;
      wWing: number;
      finnedSashimiXWing: number;
      emptyRectangle: number;
      uniqueRectangleType1: number;
      uniqueRectangleType2: number;
      uniqueRectangleType3: number;
      uniqueRectangleType4: number;
      uniqueRectangleType5: number;
    }>;
    hard: Partial<{
      finnedSashimiSwordfish: number;
      jellyfish: number;
      bugBinaryUniversalGrave: number;
      xChain: number;
      groupedXChain: number;
      YWing4WXYZWing: number;
      yWing5: number;
      yWing6: number;
      yWing7: number;
      yWing8: number;
      yWing9: number;
      finnedSashimiJellyfish: number;
    }>;
    brutal: Partial<{
      medusa3D: number;
      xyChain: number;
      alternatingInferenceChainAIC: number;
      groupedAlternatingInferenceChainAIC: number;
    }>;
    beyondBrutal: Partial<{
      nishioForcingChain: number;
      nishioForcingNet: number;
    }>;
  }>;
}
