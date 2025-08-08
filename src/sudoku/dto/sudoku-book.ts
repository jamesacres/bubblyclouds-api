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
    }
  };
  techniques: {
    basic: {
      lastDigit:number;
      hiddenSingleBox: number;
      hiddenSingleLine: number;
      hiddenSingleVariantRegion: number;
      nakedSingle: number;
    };
    simple: {
      Hidden Pair
      Locked Candidate
      Hidden Triple
      Hidden Quadruple
      Naked Pair
      Naked Triple
      Naked Quadruple
    }
    advanced: {
      X-Wing
      Swordfish
      Skyscraper
      Two-String-Kite
      Crane
      Simple Coloring
      Y-Wing
      XYZ-Wing
      W-Wing
      Finned/Sashimi X-Wing
      Empty Rectangle
      Unique Rectangle Type 1
      Unique Rectangle Type 2
      Unique Rectangle Type 3
      Unique Rectangle Type 4
      Unique Rectangle Type 5
    };
    hard: {
      Finned/Sashimi Swordfish
      Jellyfish
      BUG (Binary Universal Grave)
      X-Chain
      Grouped X-Chain
      4-Y-Wing (WXYZ-Wing)
      5-Y-Wing
      6-Y-Wing
      7-Y-Wing
      8-Y-Wing
      9-Y-Wing
      Finned/Sashimi Jellyfish
    };
    brutal: {
      3D Medusa
      XY-Chain
      Alternating Inference Chain (AIC)
      Grouped Alternating Inference Chain (AIC)
      
    }
    beyondBrutal: {
      Nishio Forcing Chain
      Nishio Forcing Net
    }
  }
}

export interface SudokuBook {
  sudokuBookId: string;
  puzzles: SudokuBookPuzzle[];
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
