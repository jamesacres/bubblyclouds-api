import { Injectable } from '@nestjs/common';
import { DynamoDBAdapter } from '@/dynamodb/dynamodb-adapter';
import { DynamoDBAdapterFactory } from '@/dynamodb/dynamodb-adapter.factory';
import { Model } from '@/types/enums/model';
import { SudokuBook } from '../dto/sudoku-book';
import { SudokuBookEntity } from '../entities/sudoku-book.entity';

@Injectable()
export class SudokuBookRepository {
  private adapter: DynamoDBAdapter<SudokuBook>;

  constructor(dynamoDBAdapterFactory: DynamoDBAdapterFactory) {
    this.adapter = dynamoDBAdapterFactory.createAdapter(Model.SUDOKU_BOOK);
  }

  private sudokuBookOfTheMonthId(isNextMonth: boolean | undefined) {
    const now = new Date();
    if (isNextMonth) {
      now.setMonth(now.getMonth() + 1);
    }
    const date = now.toISOString().slice(0, 10).replaceAll('-', '');
    return `ofthemonth-${date}`;
  }

  async insertSudokuBookOfTheMonth(
    payload: Omit<
      SudokuBook,
      'sudokuBookId' | 'createdAt' | 'updatedAt' | 'expiresAt'
    >,
    isNextMonth: boolean | undefined,
  ): Promise<SudokuBookEntity> {
    const sudokuBookId = this.sudokuBookOfTheMonthId(isNextMonth);
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + (isNextMonth ? 2 : 1));
    expiresAt.setDate(1);
    return new SudokuBookEntity(
      await this.adapter.upsert(
        sudokuBookId,
        { ...payload, sudokuBookId },
        { id: 'ofthemonth', type: Model.SUDOKU_BOOK },
        expiresAt,
      ),
    );
  }

  async findSudokuBookOfTheMonth(
    isNextMonth: boolean | undefined,
  ): Promise<SudokuBookEntity | undefined> {
    const sudokuBookId = this.sudokuBookOfTheMonthId(isNextMonth);
    return this.adapter.findByIdAndOwner(sudokuBookId, {
      id: 'ofthemonth',
      type: Model.SUDOKU_BOOK,
    });
  }
}
