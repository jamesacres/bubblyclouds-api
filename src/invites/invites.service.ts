import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateInviteDto } from './dto/create-invite.dto';
import { PublicInviteDto } from './dto/public-invite.dto';
import { InviteRepository } from './repository/invite.repository';
import { PartyRepository } from '@/parties/repository/party.repository';
import { Model } from '@/types/enums/model';
import { PartyEntity } from '@/parties/entities/party.entity';
import { InviteDto } from './dto/invite.dto';
import { splitModelId } from '@/utils/splitModelId';
import { MemberRepository } from '@/members/repository/member.repository';

@Injectable()
export class InvitesService {
  constructor(
    private readonly inviteRepository: InviteRepository,
    private readonly partyRepository: PartyRepository,
    private readonly memberRepository: MemberRepository,
  ) {}

  private async findResource(
    resourceId: string,
    createdBy: string | undefined,
    requestedBy: string | undefined,
  ): Promise<PartyEntity | undefined> {
    const [type, id] = splitModelId(resourceId);
    if (type === Model.PARTY) {
      const party = await this.partyRepository.find(id, createdBy);
      if (party) {
        const maxSize = party.maxSize;
        const members =
          await this.memberRepository.findAllMembersForResource(resourceId);
        const isInParty = !!members.find(
          (member) => member.userId === requestedBy,
        );
        if (!isInParty && members.length >= maxSize) {
          // Treat as expired when full if not in party
          console.warn('memberCount >= maxSize', members.length, maxSize);
          return undefined;
        }
      }
      return party;
    }
  }

  async create(
    {
      expiresAt,
      resourceId,
      description,
      sessionId,
      redirectUri,
    }: CreateInviteDto,
    createdBy: string,
  ): Promise<InviteDto> {
    // Validate the resource was created by the userId from the request
    if (!(await this.findResource(resourceId, createdBy, createdBy))) {
      throw new NotFoundException('Resource not found');
    }
    return this.inviteRepository.insert({
      resourceId,
      description,
      sessionId,
      redirectUri,
      createdBy,
      expiresAt,
    });
  }

  async findPublicInvite(
    inviteId: string,
    requestedBy: string | undefined,
  ): Promise<PublicInviteDto> {
    const invite = await this.inviteRepository.find(inviteId);
    if (!invite) {
      throw new NotFoundException('Invite not found');
    }
    // Check resource still exists
    const resource = await this.findResource(
      invite.resourceId,
      undefined,
      requestedBy,
    );
    if (!resource) {
      throw new NotFoundException('Resource not found');
    }
    // We expect the app to then:
    // Logs the user in if not already logged in
    // Stores sessionId and redirectUri which it uses to redirect after joining as a member (i.e. redirect them to the game)
    return {
      resourceId: invite.resourceId,
      description: invite.description,
      sessionId: invite.sessionId,
      redirectUri: invite.redirectUri,
    };
  }
}
