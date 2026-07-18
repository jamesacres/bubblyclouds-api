import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  generateSudokuSelection,
  readAllSudokuSeeds,
} from './sudoku-seed-reader';
import { SudokuCoachPuzzleDifficulty } from '@/types/enums/difficulty.enum';

const HEADER = [
  'Sudoku',
  'Solution',
  'Difficulty',
  'SE',
  'HoDoKu',
  'TediousnessPercentage',
  'NbrOfGivens',
  'CountBasic',
  'CountSimple',
  'CountAdvanced',
  'CountMoreAdvanced',
  'CountHard',
  'CountBrutal',
  'Last Digit',
  'Naked Single',
  'Hidden Pair',
  'X-Wing',
  'Jellyfish',
  'XY-Chain',
  'Nishio Forcing Chain',
].join('  ');

const rowFor = (difficulty: string, sudoku: string, solution: string) =>
  [
    sudoku,
    solution,
    difficulty,
    '1.5',
    '10',
    '25',
    '30',
    '5',
    '2',
    '1',
    '0',
    '0',
    '0',
    '3', // Last Digit
    '4', // Naked Single
    '2', // Hidden Pair
    '1', // X-Wing
    '1', // Jellyfish
    '1', // XY-Chain
    '1', // Nishio Forcing Chain
  ].join('  ');

const zeros = (n: number) => '0'.repeat(n);
const puzzle = zeros(81);
const solution = '1'.repeat(81);

describe('sudoku-seed-reader', () => {
  let seedsDir: string;

  beforeEach(() => {
    seedsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seeds-'));
  });

  afterEach(() => {
    fs.rmSync(seedsDir, { recursive: true, force: true });
  });

  const writeSeed = (name: string, difficultyLabel: string, rows = 3) => {
    const lines = [HEADER];
    for (let i = 0; i < rows; i++) {
      lines.push(rowFor(difficultyLabel, puzzle, solution));
    }
    fs.writeFileSync(path.join(seedsDir, name), lines.join('\n'));
  };

  it('reads all seed files and maps rows into puzzles', () => {
    writeSeed('4-moderate.txt', 'Moderate', 2);
    const result = readAllSudokuSeeds(seedsDir);
    expect(Object.keys(result)).toContain('4-moderate');
    const puzzles = result['4-moderate'];
    expect(puzzles).toHaveLength(2);
    // 0s replaced with .
    expect(puzzles[0].initial).toBe('.'.repeat(81));
    expect(puzzles[0].final).toBe('1'.repeat(81));
    expect(puzzles[0].difficulty.coach).toBe(
      SudokuCoachPuzzleDifficulty.MODERATE,
    );
    expect(puzzles[0].difficulty.count.givens).toBe(30);
    expect(puzzles[0].techniques.basic?.lastDigit).toBe(3);
    expect(puzzles[0].techniques.hard?.jellyfish).toBe(1);
    expect(puzzles[0].techniques.brutal?.xyChain).toBe(1);
    expect(puzzles[0].techniques.beyondBrutal?.nishioForcingChain).toBe(1);
  });

  it('maps an unrecognised difficulty label to MODERATE', () => {
    writeSeed('weird.txt', 'Totally Unknown', 1);
    const result = readAllSudokuSeeds(seedsDir);
    expect(result['weird'][0].difficulty.coach).toBe(
      SudokuCoachPuzzleDifficulty.MODERATE,
    );
  });

  it('returns an empty array for a seed file with only a header', () => {
    fs.writeFileSync(path.join(seedsDir, 'empty.txt'), HEADER);
    const result = readAllSudokuSeeds(seedsDir);
    // readSeedFile throws -> caught -> []
    expect(result['empty']).toEqual([]);
  });

  it('generateSudokuSelection picks puzzles across difficulty files', () => {
    // Provide the difficulty files the distribution expects
    writeSeed('1-very-easy.txt', 'Very Easy', 5);
    writeSeed('2-easy.txt', 'Easy', 5);
    writeSeed('4-moderate.txt', 'Moderate', 20);
    const selection = generateSudokuSelection(seedsDir);
    // 1 + 3 + 9 from the three files we provided; other files missing -> logged & skipped
    expect(selection.length).toBeGreaterThan(0);
    selection.forEach((p) => {
      expect(p.initial).toHaveLength(81);
      expect(p.final).toHaveLength(81);
    });
  });

  it('selectRandomPuzzles returns all when count exceeds available', () => {
    // Only 1 row but distribution wants more -> returns the single available
    writeSeed('4-moderate.txt', 'Moderate', 1);
    const selection = generateSudokuSelection(seedsDir);
    expect(selection.length).toBeGreaterThanOrEqual(1);
  });
});
