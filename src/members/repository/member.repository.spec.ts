import { MemberRepository } from './member.repository';
import { MemberEntity } from '../entities/member.entity';
import { Model } from '@/types/enums/model';

const makeAdapter = () => ({
  upsert: jest.fn(),
  findByIdAndOwner: jest.fn(),
  findAllByModelId: jest.fn(),
  findAllByOwner: jest.fn(),
  destroy: jest.fn(),
  batchDestroy: jest.fn(),
});

const record = (over = {}) => ({
  userId: 'user1',
  resourceId: 'party-p1',
  memberNickname: 'Nick',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...over,
});

describe('MemberRepository', () => {
  let adapter: ReturnType<typeof makeAdapter>;
  let repository: MemberRepository;

  beforeEach(() => {
    adapter = makeAdapter();
    repository = new MemberRepository({
      createAdapter: () => adapter,
    } as never);
  });

  it('insert upserts with a user-prefixed member id owned by the resource', async () => {
    adapter.upsert.mockResolvedValue(record());
    await repository.insert({
      userId: 'user1',
      resourceId: 'party-p1',
      memberNickname: 'Nick',
    });
    const [id, , owner] = adapter.upsert.mock.calls[0];
    expect(id).toBe('user-user1');
    expect(owner).toEqual({ id: 'p1', type: Model.PARTY });
  });

  it('findAllMembersForResource sorts oldest first', async () => {
    adapter.findAllByOwner.mockResolvedValue([
      record({ userId: 'b', createdAt: new Date('2024-02-01') }),
      record({ userId: 'a', createdAt: new Date('2024-01-01') }),
    ]);
    const result = await repository.findAllMembersForResource('party-p1');
    expect(result.map((m) => m.userId)).toEqual(['a', 'b']);
    expect(adapter.findAllByOwner).toHaveBeenCalledWith(
      { id: 'p1', type: Model.PARTY },
      { type: Model.MEMBER },
    );
  });

  it('findAllForUser sorts newest first and queries by member id', async () => {
    adapter.findAllByModelId.mockResolvedValue([
      record({ resourceId: 'party-a', createdAt: new Date('2024-01-01') }),
      record({ resourceId: 'party-b', createdAt: new Date('2024-02-01') }),
    ]);
    const result = await repository.findAllForUser('user1', {
      type: Model.PARTY,
    });
    expect(result.map((m) => m.resourceId)).toEqual(['party-b', 'party-a']);
    expect(adapter.findAllByModelId).toHaveBeenCalledWith('user-user1', {
      type: Model.PARTY,
    });
  });

  it('findForUser returns an entity when the member is found', async () => {
    adapter.findByIdAndOwner.mockResolvedValue(record());
    const result = await repository.findForUser('user1', Model.PARTY, 'p1');
    expect(result).toBeInstanceOf(MemberEntity);
    expect(adapter.findByIdAndOwner).toHaveBeenCalledWith('user-user1', {
      type: Model.PARTY,
      id: 'p1',
    });
  });

  it('findForUser returns undefined when the member is missing', async () => {
    adapter.findByIdAndOwner.mockResolvedValue(undefined);
    const result = await repository.findForUser('user1', Model.PARTY, 'p1');
    expect(result).toBeUndefined();
  });

  it('destroy maps the member to id/owner', async () => {
    await repository.destroy(new MemberEntity(record()));
    expect(adapter.destroy).toHaveBeenCalledWith('user-user1', {
      id: 'p1',
      type: Model.PARTY,
    });
  });

  it('batchDestroy maps members to id/owner pairs', async () => {
    await repository.batchDestroy([
      new MemberEntity(record({ userId: 'a', resourceId: 'party-x' })),
    ]);
    expect(adapter.batchDestroy).toHaveBeenCalledWith([
      { id: 'user-a', owner: { id: 'x', type: Model.PARTY } },
    ]);
  });
});
