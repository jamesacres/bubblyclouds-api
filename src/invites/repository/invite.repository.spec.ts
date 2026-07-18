import { InviteRepository } from './invite.repository';
import { InviteEntity } from '../entities/invite.entity';
import { Model } from '@/types/enums/model';

const makeAdapter = () => ({
  upsert: jest.fn(),
  findAllByModelId: jest.fn(),
  findAllByOwner: jest.fn(),
  batchDestroy: jest.fn(),
});

const record = (over = {}) => ({
  inviteId: 'i1',
  resourceId: 'party-p1',
  createdBy: 'user1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...over,
});

describe('InviteRepository', () => {
  let adapter: ReturnType<typeof makeAdapter>;
  let repository: InviteRepository;

  beforeEach(() => {
    adapter = makeAdapter();
    repository = new InviteRepository({
      createAdapter: () => adapter,
    } as never);
  });

  it('insert upserts an invite owned by the resource with an expiry', async () => {
    adapter.upsert.mockResolvedValue(record());
    const expiresAt = new Date(Date.now() + 100000);
    await repository.insert({
      resourceId: 'party-p1',
      createdBy: 'user1',
      expiresAt,
    } as never);
    const [id, payload, owner, exp] = adapter.upsert.mock.calls[0];
    expect(typeof id).toBe('string');
    expect(payload.inviteId).toBe(id);
    expect(owner).toEqual({ id: 'p1', type: Model.PARTY });
    expect(exp).toBe(expiresAt);
  });

  it('find returns an entity when exactly one record matches', async () => {
    adapter.findAllByModelId.mockResolvedValue([record()]);
    const result = await repository.find('i1');
    expect(result).toBeInstanceOf(InviteEntity);
  });

  it('find returns undefined when there is not exactly one match', async () => {
    adapter.findAllByModelId.mockResolvedValue([]);
    expect(await repository.find('i1')).toBeUndefined();
    adapter.findAllByModelId.mockResolvedValue([record(), record()]);
    expect(await repository.find('i1')).toBeUndefined();
  });

  it('findAllInvitesForResource sorts oldest first', async () => {
    adapter.findAllByOwner.mockResolvedValue([
      record({ inviteId: 'b', createdAt: new Date('2024-02-01') }),
      record({ inviteId: 'a', createdAt: new Date('2024-01-01') }),
    ]);
    const result = await repository.findAllInvitesForResource('party-p1');
    expect(result.map((i) => i.inviteId)).toEqual(['a', 'b']);
    expect(adapter.findAllByOwner).toHaveBeenCalledWith(
      { id: 'p1', type: Model.PARTY },
      { type: Model.INVITE },
    );
  });

  it('batchDestroy maps invites to id/owner pairs', async () => {
    await repository.batchDestroy([
      new InviteEntity(record({ inviteId: 'a', resourceId: 'party-x' })),
    ]);
    expect(adapter.batchDestroy).toHaveBeenCalledWith([
      { id: 'a', owner: { id: 'x', type: Model.PARTY } },
    ]);
  });
});
