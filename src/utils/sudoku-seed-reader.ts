import * as fs from 'fs';
import * as path from 'path';
import { SudokuBookPuzzle } from '@/sudoku/dto/sudoku-book-puzzle';
import { SudokuCoachPuzzleDifficulty } from '@/types/enums/difficulty.enum';

interface SeedFileRow {
  [key: string]: string;
}

/**
 * Bell curve distribution for difficulty levels (totaling 50 puzzles)
 */
const DIFFICULTY_DISTRIBUTION = {
  '1-very-easy': 1,
  '2-easy': 3,
  '3-moderately-easy': 6,
  '4-moderate': 10,
  '5-moderately-hard': 12,
  '6-hard': 10,
  '7-vicious': 6,
  '8-fiendish': 3,
  '9-devilish': 2,
  '10-hell': 1,
  '11-beyond-hell': 1,
};

/**
 * Selects random puzzles from an array
 */
function selectRandomPuzzles<T>(array: T[], count: number): T[] {
  if (count >= array.length) return [...array];

  const selected: T[] = [];
  const indices = new Set<number>();

  while (selected.length < count) {
    const randomIndex = Math.floor(Math.random() * array.length);
    if (!indices.has(randomIndex)) {
      indices.add(randomIndex);
      selected.push(array[randomIndex]);
    }
  }

  return selected;
}

/**
 * Parses a CSV-like row into an object with column names as keys
 */
function parseRow(row: string, headers: string[]): SeedFileRow {
  const values = row.split('\t');
  const result: SeedFileRow = {};

  headers.forEach((header, index) => {
    result[header] = values[index] || '';
  });

  return result;
}

/**
 * Maps difficulty string to enum value
 */
function mapDifficulty(difficultyStr: string): SudokuCoachPuzzleDifficulty {
  const difficultyMap: { [key: string]: SudokuCoachPuzzleDifficulty } = {
    'Very Easy': SudokuCoachPuzzleDifficulty.VERY_EASY,
    Easy: SudokuCoachPuzzleDifficulty.EASY,
    'Moderately Easy': SudokuCoachPuzzleDifficulty.MODERATELY_EASY,
    Moderate: SudokuCoachPuzzleDifficulty.MODERATE,
    'Moderately Hard': SudokuCoachPuzzleDifficulty.MODERATELY_HARD,
    Hard: SudokuCoachPuzzleDifficulty.HARD,
    Vicious: SudokuCoachPuzzleDifficulty.VICIOUS,
    Fiendish: SudokuCoachPuzzleDifficulty.FIENDISH,
    Devilish: SudokuCoachPuzzleDifficulty.DEVILISH,
    Hell: SudokuCoachPuzzleDifficulty.HELL,
    'Beyond Hell': SudokuCoachPuzzleDifficulty.BEYOND_HELL,
  };

  return difficultyMap[difficultyStr] || SudokuCoachPuzzleDifficulty.MODERATE;
}

/**
 * Converts seed file row to SudokuBookPuzzle
 */
function mapRowToPuzzle(row: SeedFileRow): SudokuBookPuzzle {
  return {
    initial: row['Sudoku'] || '',
    final: row['Solution'] || '',
    difficulty: {
      coach: mapDifficulty(row['Difficulty']),
      sudokuExplainer: parseFloat(row['SE']) || 0,
      hoDoKu: parseFloat(row['HoDoKu']) || 0,
      tediousPercent: parseFloat(row['TediousnessPercentage']) || 0,
      count: {
        givens: parseInt(row['NbrOfGivens']) || 0,
        basic: parseInt(row['CountBasic']) || 0,
        simple: parseInt(row['CountSimple']) || 0,
        advanced: parseInt(row['CountAdvanced']) || 0,
        moreAdvanced: parseInt(row['CountMoreAdvanced']) || 0,
        hard: parseInt(row['CountHard']) || 0,
        brutal: parseInt(row['CountBrutal']) || 0,
      },
    },
    techniques: {
      basic: {
        lastDigit: parseInt(row['Last Digit']) || undefined,
        hiddenSingleBox: parseInt(row['Hidden Single (Box)']) || undefined,
        hiddenSingleLine: parseInt(row['Hidden Single (Line)']) || undefined,
        hiddenSingleVariantRegion:
          parseInt(row['Hidden Single (Variant Region)']) || undefined,
        nakedSingle: parseInt(row['Naked Single']) || undefined,
      },
      simple: {
        hiddenPair: parseInt(row['Hidden Pair']) || undefined,
        lockedCandidate: parseInt(row['Locked Candidate']) || undefined,
        hiddenTriple: parseInt(row['Hidden Triple']) || undefined,
        hiddenQuadruple: parseInt(row['Hidden Quadruple']) || undefined,
        nakedPair: parseInt(row['Naked Pair']) || undefined,
        nakedTriple: parseInt(row['Naked Triple']) || undefined,
        nakedQuadruple: parseInt(row['Naked Quadruple']) || undefined,
      },
      advanced: {
        xWing: parseInt(row['X-Wing']) || undefined,
        swordfish: parseInt(row['Swordfish']) || undefined,
        skyscraper: parseInt(row['Skyscraper']) || undefined,
        twoStringKite: parseInt(row['Two-String-Kite']) || undefined,
        crane: parseInt(row['Crane']) || undefined,
        simpleColoring: parseInt(row['Simple Coloring']) || undefined,
        yWing: parseInt(row['Y-Wing']) || undefined,
        xYZWing: parseInt(row['XYZ-Wing']) || undefined,
        wWing: parseInt(row['W-Wing']) || undefined,
        finnedSashimiXWing: parseInt(row['Finned/Sashimi X-Wing']) || undefined,
        emptyRectangle: parseInt(row['Empty Rectangle']) || undefined,
        uniqueRectangleType1:
          parseInt(row['Unique Rectangle Type 1']) || undefined,
        uniqueRectangleType2:
          parseInt(row['Unique Rectangle Type 2']) || undefined,
        uniqueRectangleType3:
          parseInt(row['Unique Rectangle Type 3']) || undefined,
        uniqueRectangleType4:
          parseInt(row['Unique Rectangle Type 4']) || undefined,
        uniqueRectangleType5:
          parseInt(row['Unique Rectangle Type 5']) || undefined,
      },
      hard: {
        finnedSashimiSwordfish:
          parseInt(row['Finned/Sashimi Swordfish']) || undefined,
        jellyfish: parseInt(row['Jellyfish']) || undefined,
        bugBinaryUniversalGrave:
          parseInt(row['BUG (Binary Universal Grave)']) || undefined,
        xChain: parseInt(row['X-Chain']) || undefined,
        groupedXChain: parseInt(row['Grouped X-Chain']) || undefined,
        YWing4WXYZWing: parseInt(row['4-Y-Wing (WXYZ-Wing)']) || undefined,
        yWing5: parseInt(row['5-Y-Wing']) || undefined,
        yWing6: parseInt(row['6-Y-Wing']) || undefined,
        yWing7: parseInt(row['7-Y-Wing']) || undefined,
        yWing8: parseInt(row['8-Y-Wing']) || undefined,
        yWing9: parseInt(row['9-Y-Wing']) || undefined,
        finnedSashimiJellyfish:
          parseInt(row['Finned/Sashimi Jellyfish']) || undefined,
      },
      brutal: {
        medusa3D: parseInt(row['3D Medusa']) || undefined,
        xyChain: parseInt(row['XY-Chain']) || undefined,
        alternatingInferenceChainAIC:
          parseInt(row['Alternating Inference Chain (AIC)']) || undefined,
        groupedAlternatingInferenceChainAIC:
          parseInt(row['Grouped Alternating Inference Chain (AIC)']) ||
          undefined,
      },
      beyondBrutal: {
        nishioForcingChain: parseInt(row['Nishio Forcing Chain']) || undefined,
        nishioForcingNet: parseInt(row['Nishio Forcing Net']) || undefined,
      },
    },
  };
}

/**
 * Reads a seed file and returns all puzzles
 */
function readSeedFile(filePath: string): SudokuBookPuzzle[] {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Seed file not found: ${absolutePath}`);
  }

  const fileContent = fs.readFileSync(absolutePath, 'utf-8');
  const lines = fileContent.split('\n').filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error(
      'Seed file must contain at least a header row and one data row',
    );
  }

  // First line is header
  const headers = lines[0].split('\t');
  const dataLines = lines.slice(1);

  // Parse all rows and convert to puzzles
  const puzzles: SudokuBookPuzzle[] = [];

  for (const line of dataLines) {
    const row = parseRow(line, headers);
    const puzzle = mapRowToPuzzle(row);
    puzzles.push(puzzle);
  }

  return puzzles;
}

/**
 * Generates 50 sudoku puzzles with bell curve distribution across difficulty levels
 */
export function generateSudokuSelection(
  seedsDir: string = '/Users/jamesacres/Documents/git/bubblyclouds-api/src/config/sudoku/seeds',
): SudokuBookPuzzle[] {
  const allPuzzles: SudokuBookPuzzle[] = [];

  // Read each difficulty file and select random puzzles based on distribution
  for (const [difficulty, count] of Object.entries(DIFFICULTY_DISTRIBUTION)) {
    const filePath = path.join(seedsDir, `${difficulty}.txt`);

    try {
      const puzzlesFromFile = readSeedFile(filePath);
      const selectedPuzzles = selectRandomPuzzles(puzzlesFromFile, count);
      allPuzzles.push(...selectedPuzzles);
    } catch (error) {
      console.error(`Error reading seed file ${difficulty}.txt:`, error);
    }
  }

  return allPuzzles;
}

/**
 * Reads all seed files and returns all puzzles by difficulty
 */
export function readAllSudokuSeeds(
  seedsDir: string = '/Users/jamesacres/Documents/git/bubblyclouds-api/src/config/sudoku/seeds',
): { [key: string]: SudokuBookPuzzle[] } {
  const seedFiles = fs
    .readdirSync(seedsDir)
    .filter((file) => file.endsWith('.txt'));
  const result: { [key: string]: SudokuBookPuzzle[] } = {};

  for (const file of seedFiles) {
    const filePath = path.join(seedsDir, file);
    const difficulty = file.replace('.txt', '');

    try {
      result[difficulty] = readSeedFile(filePath);
    } catch (error) {
      console.error(`Error reading seed file ${file}:`, error);
      result[difficulty] = [];
    }
  }

  return result;
}
