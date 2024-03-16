import { Injectable } from '@nestjs/common';
import { CreateInviteDto } from './dto/create-invite.dto';
import { InviteDto } from './dto/invite.dto';
import { PublicInviteDto } from './dto/public-invite.dto';
import { InviteRepository } from './repository/invite.repository';

@Injectable()
export class InvitesService {
  constructor(private readonly repository: InviteRepository) {}

  create(createInviteDto: CreateInviteDto): Promise<InviteDto> {
    // - create a new invite to the party
    // - validate the resource was created by the userId from the request
    // - request { resourceId: party-{partyId}, description (e.g. party name), expiresAt, sessionId }
    return 'This action adds a new invite' as any;
  }

  findOne(inviteId: string): Promise<PublicInviteDto> {
    // - unauthenticated endpoint
    // - lookup invite: modelId=invite-{inviteId}
    // - Check it has not expired
    // - lookup resource check it exists: modelId=resourceId
    // - Return different response { inviteId, description (partyName), sessionId }
    // - The app then:
    //     - Logs the user in if not already logged in
    //     - Stores sessionId which it uses to redirect after joining as a member (i.e. redirect them to the game)
    return `This action returns a #${inviteId} invite` as any;
  }
}
