import { InviteRepository } from '@/invites/repository/invite.repository';
import { MemberRepository } from '@/members/repository/member.repository';
import { PartyRepository } from '@/parties/repository/party.repository';
import { SessionRepository } from '@/sessions/repository/session.repository';
import { Model } from '@/types/enums/model';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AccountService {
  constructor(
    private sessionRepository: SessionRepository,
    private memberRepository: MemberRepository,
    private partyRepository: PartyRepository,
    private inviteRepository: InviteRepository,
  ) {}

  async delete(userId: string, authToken: string): Promise<void> {
    console.info('find data to delete for user', userId);
    const mySessions = await this.sessionRepository.findAllForUser(userId);
    const myMemberships = await this.memberRepository.findAllForUser(userId);
    const myParties = await this.partyRepository.findAllOwnedByUser(userId);
    const partyMembers = [];
    const partyInvites = [];
    for (const party of myParties) {
      partyMembers.push(
        ...(
          await this.memberRepository.findAllMembersForResource(
            `${Model.PARTY}-${party.partyId}`,
          )
        ).filter((member) => member.userId !== userId), // filter out myMemberships above
      );
      partyInvites.push(
        ...(await this.inviteRepository.findAllInvitesForResource(
          `${Model.PARTY}-${party.partyId}`,
        )),
      );
    }
    console.info('data to delete for user', userId);
    if (mySessions.length) {
      console.info(
        'delete my sessions',
        mySessions.map((session) => session.sessionId),
      );
      await this.sessionRepository.batchDestroy(mySessions);
    }
    if (myMemberships.length) {
      console.info(
        'delete my memberships',
        myMemberships.map((member) => `${member.userId} ${member.resourceId}`),
      );
      await this.memberRepository.batchDestroy(myMemberships);
    }
    if (myParties.length) {
      console.info(
        'delete my parties',
        myParties.map((party) => `${party.partyId}`),
      );
      await this.partyRepository.batchDestroy(myParties);
    }
    if (partyMembers.length) {
      console.info(
        'delete party members',
        partyMembers.map((member) => `${member.userId} ${member.resourceId}`),
      );
      await this.memberRepository.batchDestroy(partyMembers);
    }
    if (partyInvites.length) {
      console.info(
        'delete party invites',
        partyInvites.map((invite) => `${invite.inviteId} ${invite.resourceId}`),
      );
      await this.inviteRepository.batchDestroy(partyInvites);
    }

    // Call the auth service to delete the user account
    try {
      console.info('Deleting auth user', userId);
      const response = await fetch(
        `https://auth.bubblyclouds.com/api/account/${encodeURIComponent(userId)}/delete`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        console.error('Failed to delete auth user', {
          userId,
          statusCode: response.status,
        });
      } else {
        console.info('Successfully deleted auth user', userId);
      }
    } catch (error) {
      console.error('Error deleting auth user', error, userId);
    }
  }
}
