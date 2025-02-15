import { Injectable } from '@nestjs/common';
import { DynamoDBAdapter } from '@/dynamodb/dynamodb-adapter';
import { Sudoku } from '../dto/sudoku';
import { DynamoDBAdapterFactory } from '@/dynamodb/dynamodb-adapter.factory';
import { SudokuEntity } from '../entities/sudoku.entity';
import { Model } from '@/types/enums/model';
import { Difficulty } from '@/types/enums/difficulty.enum';

@Injectable()
export class SudokuRepository {
  private adapter: DynamoDBAdapter<Sudoku>;

  constructor(dynamoDBAdapterFactory: DynamoDBAdapterFactory) {
    this.adapter = dynamoDBAdapterFactory.createAdapter(Model.SUDOKU);
  }

  private sudokuOfTheDayId(difficulty: Difficulty) {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replaceAll('-', '');
    return `oftheday-${date}-${difficulty}`;
  }

  async insertSudokuOfTheDay(
    payload: Omit<Sudoku, 'sudokuId' | 'createdAt' | 'updatedAt'>,
  ): Promise<SudokuEntity> {
    const sudokuId = this.sudokuOfTheDayId(payload.difficulty);
    const expiresAt = new Date();
    expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 1);
    return new SudokuEntity(
      await this.adapter.upsert(
        sudokuId,
        { ...payload, sudokuId },
        { id: 'oftheday', type: Model.SUDOKU },
        expiresAt,
      ),
    );
  }

  async findSudokuOfTheDay(
    difficulty: Difficulty,
  ): Promise<SudokuEntity | undefined> {
    const sudokuId = this.sudokuOfTheDayId(difficulty);
    return this.adapter.findByIdAndOwner(sudokuId, {
      id: 'oftheday',
      type: Model.SUDOKU,
    });
  }
}
