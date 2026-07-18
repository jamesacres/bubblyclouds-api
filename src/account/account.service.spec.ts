import { AccountService } from './account.service';
import { Model } from '@/types/enums/model';

describe('AccountService', () => {
  const realFetch = global.fetch;
  let sessionRepository: { findAllForUser: jest.Mock; batchDestroy: jest.Mock };
  let memberRepository: {
    findAllForUser: jest.Mock;
    findAllMembersForResource: jest.Mock;
    batchDestroy: jest.Mock;
  };
  let partyRepository: {
    findAllOwnedByUser: jest.Mock;
    batchDestroy: jest.Mock;
  };
  let inviteRepository: {
    findAllInvitesForResource: jest.Mock;
    batchDestroy: jest.Mock;
  };
  let service: AccountService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    sessionRepository = {
      findAllForUser: jest.fn().mockResolvedValue([]),
      batchDestroy: jest.fn(),
    };
    memberRepository = {
      findAllForUser: jest.fn().mockResolvedValue([]),
      findAllMembersForResource: jest.fn().mockResolvedValue([]),
      batchDestroy: jest.fn(),
    };
    partyRepository = {
      findAllOwnedByUser: jest.fn().mockResolvedValue([]),
      batchDestroy: jest.fn(),
    };
    inviteRepository = {
      findAllInvitesForResource: jest.fn().mockResolvedValue([]),
      batchDestroy: jest.fn(),
    };
    service = new AccountService(
      sessionRepository as never,
      memberRepository as never,
      partyRepository as never,
      inviteRepository as never,
    );
    fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(console, 'info').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = realFetch;
    jest.restoreAllMocks();
  });

  it('does no batch deletes when the user has no data, but still calls auth', async () => {
    await service.delete('user1', 'token');
    expect(sessionRepository.batchDestroy).not.toHaveBeenCalled();
    expect(memberRepository.batchDestroy).not.toHaveBeenCalled();
    expect(partyRepository.batchDestroy).not.toHaveBeenCalled();
    expect(inviteRepository.batchDestroy).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://auth.bubblyclouds.com/api/account/user1/delete',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      }),
    );
  });

  it('deletes sessions, memberships, parties and their members/invites', async () => {
    sessionRepository.findAllForUser.mockResolvedValue([{ sessionId: 's1' }]);
    memberRepository.findAllForUser.mockResolvedValue([
      { userId: 'user1', resourceId: 'party-p1' },
    ]);
    partyRepository.findAllOwnedByUser.mockResolvedValue([{ partyId: 'p1' }]);
    memberRepository.findAllMembersForResource.mockResolvedValue([
      { userId: 'user1', resourceId: 'party-p1' }, // self -> filtered out
      { userId: 'friend', resourceId: 'party-p1' },
    ]);
    inviteRepository.findAllInvitesForResource.mockResolvedValue([
      { inviteId: 'i1', resourceId: 'party-p1' },
    ]);

    await service.delete('user1', 'token');

    expect(sessionRepository.batchDestroy).toHaveBeenCalledWith([
      { sessionId: 's1' },
    ]);
    expect(memberRepository.findAllMembersForResource).toHaveBeenCalledWith(
      `${Model.PARTY}-p1`,
    );
    // memberships (my own) and party members (friend only) each get a batch destroy
    expect(memberRepository.batchDestroy).toHaveBeenCalledWith([
      { userId: 'user1', resourceId: 'party-p1' },
    ]);
    expect(memberRepository.batchDestroy).toHaveBeenCalledWith([
      { userId: 'friend', resourceId: 'party-p1' },
    ]);
    expect(partyRepository.batchDestroy).toHaveBeenCalledWith([
      { partyId: 'p1' },
    ]);
    expect(inviteRepository.batchDestroy).toHaveBeenCalledWith([
      { inviteId: 'i1', resourceId: 'party-p1' },
    ]);
  });

  it('logs but does not throw when the auth delete responds not ok', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    await expect(service.delete('user1', 'token')).resolves.toBeUndefined();
  });

  it('swallows errors thrown by the auth delete call', async () => {
    fetchMock.mockRejectedValue(new Error('network'));
    await expect(service.delete('user1', 'token')).resolves.toBeUndefined();
  });
});
