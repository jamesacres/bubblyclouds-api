import { scrambleSudoku } from './scrambleSudoku';

const PUZZLE =
  '..3.2.6..9..3.5..1..18.64....81.29..7.......8..67.82....26.95..8..2.3..9..5.1.3..';
const SOLUTION =
  '483921657967345821251876493548132976729564138136798245372689514814253769695417382';

describe('scrambleSudoku', () => {
  it('scrambles a puzzle preserving 81 length and empty cells', () => {
    const { puzzle } = scrambleSudoku(PUZZLE);
    expect(puzzle).toHaveLength(81);
    // Same number of givens/empties preserved
    const emptyCount = (str: string) =>
      str.split('').filter((c) => c === '.').length;
    expect(emptyCount(puzzle)).toBe(emptyCount(PUZZLE));
  });

  it('scrambles puzzle and solution together', () => {
    const { puzzle, solution } = scrambleSudoku(PUZZLE, SOLUTION);
    expect(puzzle).toHaveLength(81);
    expect(solution).toBeDefined();
    expect(solution).toHaveLength(81);
    // Solution should contain no empty cells
    expect(solution!.includes('.')).toBe(false);
  });

  it('produces a puzzle whose givens are a subset of the solution positions', () => {
    const { puzzle, solution } = scrambleSudoku(PUZZLE, SOLUTION);
    for (let i = 0; i < 81; i++) {
      if (puzzle[i] !== '.') {
        expect(puzzle[i]).toBe(solution![i]);
      }
    }
  });

  it('throws for a puzzle that is not 81 characters', () => {
    expect(() => scrambleSudoku('123')).toThrow(
      'Sudoku string must be exactly 81 characters long',
    );
  });

  it('throws for a solution that is not 81 characters', () => {
    expect(() => scrambleSudoku(PUZZLE, '123')).toThrow(
      'Sudoku string must be exactly 81 characters long',
    );
  });

  it('is deterministic in structure across many random seeds', () => {
    // Run several times to exercise the random branches
    for (let i = 0; i < 25; i++) {
      const { puzzle, solution } = scrambleSudoku(PUZZLE, SOLUTION);
      expect(puzzle).toHaveLength(81);
      expect(solution).toHaveLength(81);
    }
  });
});
