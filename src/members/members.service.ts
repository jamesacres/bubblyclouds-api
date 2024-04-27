import { Injectable } from '@nestjs/common';
import { CreateMemberDto } from './dto/create-member.dto';
import { MemberDto } from './dto/member.dto';
import { InvitesService } from '@/invites/invites.service';
import { MemberRepository } from './repository/member.repository';

@Injectable()
export class MembersService {
  constructor(
    private inviteService: InvitesService,
    private memberRepository: MemberRepository,
  ) {}

  async create(
    createMemberDto: CreateMemberDto,
    createdBy: string,
  ): Promise<MemberDto> {
    const invite = await this.inviteService.findPublicInvite(
      createMemberDto.inviteId,
    );
    return this.memberRepository.insert({
      memberNickname: createMemberDto.memberNickname,
      resourceId: invite.resourceId,
      userId: createdBy,
    });
  }

  findAll(resourceId: string): Promise<MemberDto[]> {
    // - lookup resource members: secondary index uid={resourceId} (e.g. party-{partyId}) where modelId begins with member-
    // - Validate the requester is a member of the resource
    // - Return all members
    return `This action returns all members` as any;
  }
}
