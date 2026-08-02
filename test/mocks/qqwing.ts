// Mock of @/lib/qqwing for e2e tests so the app can boot without the wasm
// module that is only produced by a build. Returns a fixed puzzle/solution.
import { SudokuQQWingDifficulty } from '@/types/enums/difficulty.enum';

/* eslint-disable @typescript-eslint/no-unused-vars */

const INITIAL =
  '..3.2.6..9..3.5..1..18.64....81.29..7.......8..67.82....26.95..8..2.3..9..5.1.3..';
const FINAL =
  '483921657967345821251876493548132976729564138136798245372689514814253769695417382';

export const qqwing = {
  async generate(_difficulty: SudokuQQWingDifficulty): Promise<{
    initial: string;
    final: string;
  }> {
    return { initial: INITIAL, final: FINAL };
  },
  async version(): Promise<string> {
    return 'mock-qqwing';
  },
};
