import { Injectable } from '@nestjs/common';
import { CreateMemberDto } from './dto/create-member.dto';
import { MemberDto } from './dto/member.dto';

@Injectable()
export class MembersService {
  create(createMemberDto: CreateMemberDto): Promise<MemberDto> {
    // - { inviteId, memberNickname }
    // - authenticated endpoint
    // - lookup invite: modelId=invite-{inviteId}
    // - Check it has not expired
    // - lookup resource check it exists: modelId=resourceId
    // - upsert member record
    return 'This action adds a new member' as any;
  }

  findAll(resourceId: string): Promise<MemberDto[]> {
    // - lookup resource members: secondary index uid={resourceId} (e.g. party-{partyId}) where modelId begins with member-
    // - Validate the requester is a member of the resource
    // - Return all members
    return `This action returns all members` as any;
  }
}
