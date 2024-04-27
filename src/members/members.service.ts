import { Injectable, NotFoundException } from '@nestjs/common';
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

  async findAll(resourceId: string, requestedBy: string): Promise<MemberDto[]> {
    const members =
      await this.memberRepository.findAllMembersForResource(resourceId);
    // Validate the requester is a member of the resource
    if (!members.find((member) => member.userId === requestedBy)) {
      throw new NotFoundException('Resource not found');
    }
    return members;
  }
}
