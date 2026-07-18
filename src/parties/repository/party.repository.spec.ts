import { PartyRepository } from './party.repository';
import { PartyEntity } from '../entities/party.entity';
import { Model } from '@/types/enums/model';
import { App } from '@/types/enums/app.enum';

const makeAdapter = () => ({
  upsert: jest.fn(),
  findByIdAndOwner: jest.fn(),
  findAllByModelId: jest.fn(),
  findAllByOwner: jest.fn(),
  destroy: jest.fn(),
  batchDestroy: jest.fn(),
});

const record = (over: Partial<PartyEntity> = {}) => ({
  partyId: 'sudoku-p1',
  appId: 'sudoku',
  partyName: 'Party',
  createdBy: 'user1',
  maxSize: 5,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...over,
});

describe('PartyRepository', () => {
  let adapter: ReturnType<typeof makeAdapter>;
  let repository: PartyRepository;

  beforeEach(() => {
    adapter = makeAdapter();
    repository = new PartyRepository({
      createAdapter: () => adapter,
    } as never);
  });

  it('insert creates a party with a generated id owned by the creator', async () => {
    adapter.upsert.mockResolvedValue(record());
    const result = await repository.insert({
      appId: 'sudoku',
      partyName: 'Party',
      createdBy: 'user1',
      maxSize: 5,
    } as never);
    expect(result).toBeInstanceOf(PartyEntity);
    const [id, payload, owner] = adapter.upsert.mock.calls[0];
    expect(id).toMatch(/^sudoku-/);
    expect(payload.partyId).toBe(id);
    expect(owner).toEqual({ id: 'user1', type: Model.USER });
  });

  it('update upserts the existing party id', async () => {
    adapter.upsert.mockResolvedValue(record());
    await repository.update('sudoku-p1', {
      appId: 'sudoku',
      partyName: 'Renamed',
      createdBy: 'user1',
    } as never);
    const [id, payload, owner] = adapter.upsert.mock.calls[0];
    expect(id).toBe('sudoku-p1');
    expect(payload.partyId).toBe('sudoku-p1');
    expect(owner).toEqual({ id: 'user1', type: Model.USER });
  });

  it('find by id and owner uses findByIdAndOwner', async () => {
    adapter.findByIdAndOwner.mockResolvedValue(record());
    const result = await repository.find('sudoku-p1', 'user1');
    expect(adapter.findByIdAndOwner).toHaveBeenCalledWith(
      'sudoku-p1',
      { id: 'user1', type: Model.USER },
      undefined,
    );
    expect(result).toBeInstanceOf(PartyEntity);
  });

  it('find without owner uses findAllByModelId and requires exactly one result', async () => {
    adapter.findAllByModelId.mockResolvedValue([record()]);
    const result = await repository.find('sudoku-p1');
    expect(result).toBeInstanceOf(PartyEntity);
  });

  it('find returns undefined when multiple records match by model id', async () => {
    adapter.findAllByModelId.mockResolvedValue([record(), record()]);
    const result = await repository.find('sudoku-p1');
    expect(result).toBeUndefined();
  });

  it('findAllOwnedByUser sorts newest first', async () => {
    adapter.findAllByOwner.mockResolvedValue([
      record({ partyId: 'a', createdAt: new Date('2024-01-01') }),
      record({ partyId: 'b', createdAt: new Date('2024-02-01') }),
    ]);
    const result = await repository.findAllOwnedByUser('user1', App.SUDOKU);
    expect(result.map((p) => p.partyId)).toEqual(['b', 'a']);
    expect(adapter.findAllByOwner).toHaveBeenCalledWith(
      { id: 'user1', type: Model.USER },
      { type: Model.PARTY, idPrefix: App.SUDOKU },
    );
  });

  it('destroy delegates to the adapter with the party owner', async () => {
    await repository.destroy(new PartyEntity(record()));
    expect(adapter.destroy).toHaveBeenCalledWith('sudoku-p1', {
      id: 'user1',
      type: Model.USER,
    });
  });

  it('batchDestroy maps entities to id/owner pairs', async () => {
    await repository.batchDestroy([
      new PartyEntity(record({ partyId: 'a' })),
      new PartyEntity(record({ partyId: 'b' })),
    ]);
    expect(adapter.batchDestroy).toHaveBeenCalledWith([
      { id: 'a', owner: { id: 'user1', type: Model.USER } },
      { id: 'b', owner: { id: 'user1', type: Model.USER } },
    ]);
  });
});
