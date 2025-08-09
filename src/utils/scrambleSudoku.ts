class SudokuScrambler {
  private grid: string[][];
  private solutionGrid: string[][] | null = null;

  constructor(sudokuString: string, solutionString?: string) {
    this.grid = this.parseString(sudokuString);
    if (solutionString) {
      this.solutionGrid = this.parseString(solutionString);
    }
  }

  /**
   * Parse a sudoku string into a 9x9 grid
   */
  private parseString(sudokuString: string): string[][] {
    if (sudokuString.length !== 81) {
      throw new Error('Sudoku string must be exactly 81 characters long');
    }

    const grid: string[][] = [];
    for (let i = 0; i < 9; i++) {
      grid[i] = [];
      for (let j = 0; j < 9; j++) {
        grid[i][j] = sudokuString[i * 9 + j];
      }
    }
    return grid;
  }

  /**
   * Convert the grid back to a string format
   */
  private gridToString(): string {
    return this.grid.map((row) => row.join('')).join('');
  }

  /**
   * Convert the solution grid back to a string format
   */
  private solutionGridToString(): string | null {
    if (!this.solutionGrid) return null;
    return this.solutionGrid.map((row) => row.join('')).join('');
  }

  /**
   * Generate a random integer between min and max (inclusive)
   */
  private random(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Shuffle an array in place using Fisher-Yates algorithm
   */
  private shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Rotate the entire grid 90 degrees clockwise
   */
  private rotate90(): void {
    const newGrid: string[][] = Array(9)
      .fill(null)
      .map(() => Array(9).fill('.'));
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        newGrid[j][8 - i] = this.grid[i][j];
      }
    }
    this.grid = newGrid;

    if (this.solutionGrid) {
      const newSolutionGrid: string[][] = Array(9)
        .fill(null)
        .map(() => Array(9).fill('.'));
      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
          newSolutionGrid[j][8 - i] = this.solutionGrid[i][j];
        }
      }
      this.solutionGrid = newSolutionGrid;
    }
  }

  /**
   * Mirror the grid horizontally (flip left-right)
   */
  private mirrorHorizontal(): void {
    for (let i = 0; i < 9; i++) {
      this.grid[i].reverse();
    }

    if (this.solutionGrid) {
      for (let i = 0; i < 9; i++) {
        this.solutionGrid[i].reverse();
      }
    }
  }

  /**
   * Mirror the grid vertically (flip top-bottom)
   */
  private mirrorVertical(): void {
    this.grid.reverse();

    if (this.solutionGrid) {
      this.solutionGrid.reverse();
    }
  }

  /**
   * Transpose the grid (swap rows and columns)
   */
  private transpose(): void {
    const newGrid: string[][] = Array(9)
      .fill(null)
      .map(() => Array(9).fill('.'));
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        newGrid[j][i] = this.grid[i][j];
      }
    }
    this.grid = newGrid;

    if (this.solutionGrid) {
      const newSolutionGrid: string[][] = Array(9)
        .fill(null)
        .map(() => Array(9).fill('.'));
      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
          newSolutionGrid[j][i] = this.solutionGrid[i][j];
        }
      }
      this.solutionGrid = newSolutionGrid;
    }
  }

  /**
   * Apply a random number of rotations (0, 90, 180, or 270 degrees)
   */
  private randomRotation(): void {
    const rotations = this.random(0, 3);
    for (let i = 0; i < rotations; i++) {
      this.rotate90();
    }
  }

  /**
   * Apply random mirroring operations
   */
  private randomMirror(): void {
    if (Math.random() < 0.5) {
      this.mirrorHorizontal();
    }
    if (Math.random() < 0.5) {
      this.mirrorVertical();
    }
  }

  /**
   * Randomly swap bands
   */
  private randomBandSwaps(): void {
    const bands = [0, 1, 2];
    const shuffledBands = this.shuffle(bands);

    // Apply the permutation to puzzle grid
    const originalGrid = this.grid.map((row) => [...row]);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        this.grid[i * 3 + j] = originalGrid[shuffledBands[i] * 3 + j];
      }
    }

    // Apply the same permutation to solution grid
    if (this.solutionGrid) {
      const originalSolutionGrid = this.solutionGrid.map((row) => [...row]);
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          this.solutionGrid[i * 3 + j] =
            originalSolutionGrid[shuffledBands[i] * 3 + j];
        }
      }
    }
  }

  /**
   * Randomly swap stacks
   */
  private randomStackSwaps(): void {
    const stacks = [0, 1, 2];
    const shuffledStacks = this.shuffle(stacks);

    // Apply the permutation to puzzle grid
    const originalGrid = this.grid.map((row) => [...row]);
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 3; j++) {
        for (let k = 0; k < 3; k++) {
          this.grid[i][j * 3 + k] = originalGrid[i][shuffledStacks[j] * 3 + k];
        }
      }
    }

    // Apply the same permutation to solution grid
    if (this.solutionGrid) {
      const originalSolutionGrid = this.solutionGrid.map((row) => [...row]);
      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 3; j++) {
          for (let k = 0; k < 3; k++) {
            this.solutionGrid[i][j * 3 + k] =
              originalSolutionGrid[i][shuffledStacks[j] * 3 + k];
          }
        }
      }
    }
  }

  /**
   * Randomly swap rows within each band
   */
  private randomRowSwapsInBands(): void {
    for (let band = 0; band < 3; band++) {
      const rows = [0, 1, 2];
      const shuffledRows = this.shuffle(rows);

      // Apply the permutation within this band to puzzle grid
      const originalRows: string[][] = [];
      for (let i = 0; i < 3; i++) {
        originalRows[i] = [...this.grid[band * 3 + i]];
      }

      for (let i = 0; i < 3; i++) {
        this.grid[band * 3 + i] = originalRows[shuffledRows[i]];
      }

      // Apply the same permutation to solution grid
      if (this.solutionGrid) {
        const originalSolutionRows: string[][] = [];
        for (let i = 0; i < 3; i++) {
          originalSolutionRows[i] = [...this.solutionGrid[band * 3 + i]];
        }

        for (let i = 0; i < 3; i++) {
          this.solutionGrid[band * 3 + i] =
            originalSolutionRows[shuffledRows[i]];
        }
      }
    }
  }

  /**
   * Randomly swap columns within each stack
   */
  private randomColumnSwapsInStacks(): void {
    for (let stack = 0; stack < 3; stack++) {
      const cols = [0, 1, 2];
      const shuffledCols = this.shuffle(cols);

      // Apply the permutation within this stack to puzzle grid
      const originalCols: string[] = Array(9);
      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 3; j++) {
          if (j === 0) originalCols[i] = '';
          originalCols[i] += this.grid[i][stack * 3 + j];
        }
      }

      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 3; j++) {
          this.grid[i][stack * 3 + j] = originalCols[i][shuffledCols[j]];
        }
      }

      // Apply the same permutation to solution grid
      if (this.solutionGrid) {
        const originalSolutionCols: string[] = Array(9);
        for (let i = 0; i < 9; i++) {
          for (let j = 0; j < 3; j++) {
            if (j === 0) originalSolutionCols[i] = '';
            originalSolutionCols[i] += this.solutionGrid[i][stack * 3 + j];
          }
        }

        for (let i = 0; i < 9; i++) {
          for (let j = 0; j < 3; j++) {
            this.solutionGrid[i][stack * 3 + j] =
              originalSolutionCols[i][shuffledCols[j]];
          }
        }
      }
    }
  }

  /**
   * Randomly relabel digits (permute 1-9)
   */
  private randomDigitRelabeling(): void {
    const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const shuffledDigits = this.shuffle(digits);

    // Create mapping
    const mapping: { [key: string]: string } = {};
    for (let i = 0; i < 9; i++) {
      mapping[digits[i]] = shuffledDigits[i];
    }

    // Apply mapping to puzzle grid
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (this.grid[i][j] !== '.') {
          this.grid[i][j] = mapping[this.grid[i][j]];
        }
      }
    }

    // Apply the same mapping to solution grid
    if (this.solutionGrid) {
      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
          if (this.solutionGrid[i][j] !== '.') {
            this.solutionGrid[i][j] = mapping[this.solutionGrid[i][j]];
          }
        }
      }
    }
  }

  /**
   * Randomly transpose (swap rows and columns)
   */
  private randomTranspose(): void {
    if (Math.random() < 0.5) {
      this.transpose();
    }
  }

  /**
   * Main scrambling function that applies random transformations
   */
  public scramble(): { puzzle: string; solution?: string } {
    // Apply transformations in random order for maximum scrambling
    const operations = [
      () => this.randomRotation(),
      () => this.randomMirror(),
      () => this.randomBandSwaps(),
      () => this.randomStackSwaps(),
      () => this.randomRowSwapsInBands(),
      () => this.randomColumnSwapsInStacks(),
      () => this.randomDigitRelabeling(),
      () => this.randomTranspose(),
    ];

    // Shuffle the operations and apply them all
    const shuffledOperations = this.shuffle(operations);
    shuffledOperations.forEach((operation) => operation());

    const result: { puzzle: string; solution?: string } = {
      puzzle: this.gridToString(),
    };

    if (this.solutionGrid) {
      result.solution = this.solutionGridToString() || undefined;
    }

    return result;
  }
}

/**
 * Scramble a Sudoku puzzle while preserving its logical structure
 * @param sudokuString - 81-character string representing the puzzle
 * @param solutionString - Optional 81-character string representing the solution
 * @returns Scrambled puzzle and solution (if provided) in the same format
 */
export function scrambleSudoku(
  sudokuString: string,
  solutionString?: string,
): { puzzle: string; solution?: string } {
  const scrambler = new SudokuScrambler(sudokuString, solutionString);
  return scrambler.scramble();
}
