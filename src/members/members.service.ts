import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateMemberDto } from './dto/create-member.dto';
import { MemberDto } from './dto/member.dto';
import { InvitesService } from '@/invites/invites.service';
import { MemberRepository } from './repository/member.repository';
import { splitModelId } from '@/utils/splitModelId';
import { PartyRepository } from '@/parties/repository/party.repository';
import { PartyEntity } from '@/parties/entities/party.entity';
import { Model } from '@/types/enums/model';
import { RevenuecatService } from '@/revenuecat/revenuecat.service';
import { Entitlement } from '@/types/enums/entitlement.enum';

@Injectable()
export class MembersService {
  constructor(
    private readonly inviteService: InvitesService,
    private readonly memberRepository: MemberRepository,
    private readonly partyRepository: PartyRepository,
    private readonly revenuecatService: RevenuecatService,
  ) {}

  private async findResource(
    resourceId: string,
    createdBy?: string,
  ): Promise<PartyEntity | undefined> {
    const [type, id] = splitModelId(resourceId);
    if (type === Model.PARTY) {
      return this.partyRepository.find(id, createdBy);
    }
  }

  async create(
    createMemberDto: CreateMemberDto,
    userId: string,
  ): Promise<MemberDto> {
    const invite = await this.inviteService.findPublicInvite(
      createMemberDto.inviteId,
      userId,
    );
    const member = await this.memberRepository.insert({
      userId,
      memberNickname: createMemberDto.memberNickname,
      resourceId: invite.resourceId,
    });

    if (invite.entitlementDuration) {
      const hasPlus = await this.revenuecatService
        .hasEntitlement(userId, Entitlement.PLUS)
        .catch((e) => {
          console.error(e);
          return false;
        });
      if (hasPlus) {
        console.info(`${userId} already has plus`);
      } else {
        // Give entitlement for duration if they don't already have it
        console.info(
          `Give entitlement to ${userId} for duration ${invite.entitlementDuration}`,
        );
        this.revenuecatService
          .grantEntitlement(
            userId,
            Entitlement.PLUS,
            invite.entitlementDuration,
          )
          .catch((e) => {
            console.error(e);
          });
      }
    }

    return member;
  }

  async findAll(resourceId: string, requestedBy: string): Promise<MemberDto[]> {
    // Make sure resource still exists
    if (!(await this.findResource(resourceId))) {
      throw new ForbiddenException('Resource not found');
    }
    const members =
      await this.memberRepository.findAllMembersForResource(resourceId);
    // Validate the requester is a member of the resource
    if (!members.find((member) => member.userId === requestedBy)) {
      throw new NotFoundException('Resource not found');
    }
    return members;
  }

  async deleteForUser(
    requestedBy: string,
    resourceId: string,
    userToDelete: string,
  ): Promise<void> {
    // If user not deleting themselves, check they are allowed to moderate
    // Validate the resource was created by the requesting user from the request
    if (
      requestedBy !== userToDelete &&
      !(await this.findResource(resourceId, requestedBy))
    ) {
      throw new ForbiddenException('Not allowed to delete other member');
    }

    // Confirm user to delete is a member of the resource
    const [ownerType, ownerId] = splitModelId(resourceId);
    const member = await this.memberRepository.findForUser(
      userToDelete,
      ownerType,
      ownerId,
    );
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    await this.memberRepository.destroy(member);
  }
}
