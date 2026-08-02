import { SessionRepository } from './session.repository';
import { SessionEntity } from '../entities/session.entity';
import { Model } from '@/types/enums/model';
import { App } from '@/types/enums/app.enum';

const makeAdapter = () => ({
  upsert: jest.fn(),
  findByIdAndOwner: jest.fn(),
  findAllByOwner: jest.fn(),
  batchDestroy: jest.fn(),
});

const record = (over = {}) => ({
  sessionId: 'sudoku-s1',
  userId: 'user1',
  state: { a: 1 },
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...over,
});

describe('SessionRepository', () => {
  let adapter: ReturnType<typeof makeAdapter>;
  let repository: SessionRepository;

  beforeEach(() => {
    adapter = makeAdapter();
    repository = new SessionRepository({
      createAdapter: () => adapter,
    } as never);
  });

  it('upsert saves the session owned by the user', async () => {
    adapter.upsert.mockResolvedValue(record());
    const expiresAt = new Date(Date.now() + 1000);
    await repository.upsert('sudoku-s1', 'user1', {
      state: { a: 1 },
      expiresAt,
    } as never);
    const [id, payload, owner, exp] = adapter.upsert.mock.calls[0];
    expect(id).toBe('sudoku-s1');
    expect(payload).toMatchObject({ sessionId: 'sudoku-s1', userId: 'user1' });
    expect(owner).toEqual({ id: 'user1', type: Model.USER });
    expect(exp).toBe(expiresAt);
  });

  it('find returns an entity when present', async () => {
    adapter.findByIdAndOwner.mockResolvedValue(record());
    const result = await repository.find('sudoku-s1', 'user1', true);
    expect(result).toBeInstanceOf(SessionEntity);
    expect(adapter.findByIdAndOwner).toHaveBeenCalledWith(
      'sudoku-s1',
      { id: 'user1', type: Model.USER },
      true,
    );
  });

  it('find returns undefined when absent', async () => {
    adapter.findByIdAndOwner.mockResolvedValue(undefined);
    expect(await repository.find('sudoku-s1', 'user1')).toBeUndefined();
  });

  it('findAllForUser sorts newest first', async () => {
    adapter.findAllByOwner.mockResolvedValue([
      record({ sessionId: 'a', createdAt: new Date('2024-01-01') }),
      record({ sessionId: 'b', createdAt: new Date('2024-02-01') }),
    ]);
    const result = await repository.findAllForUser('user1', App.SUDOKU);
    expect(result.map((s) => s.sessionId)).toEqual(['b', 'a']);
    expect(adapter.findAllByOwner).toHaveBeenCalledWith(
      { id: 'user1', type: Model.USER },
      { type: Model.SESSION, idPrefix: App.SUDOKU },
    );
  });

  it('batchDestroy maps sessions to id/owner pairs', async () => {
    await repository.batchDestroy([
      new SessionEntity(record({ sessionId: 'a', userId: 'u' })),
    ]);
    expect(adapter.batchDestroy).toHaveBeenCalledWith([
      { id: 'a', owner: { id: 'u', type: Model.USER } },
    ]);
  });
});
