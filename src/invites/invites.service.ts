import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateInviteDto } from './dto/create-invite.dto';
import { PublicInviteDto } from './dto/public-invite.dto';
import { InviteRepository } from './repository/invite.repository';
import { PartyRepository } from '../parties/repository/party.repository';
import { Model } from '../types/model';
import { PartyEntity } from 'src/parties/entities/party.entity';
import { InviteDto } from './dto/invite.dto';

@Injectable()
export class InvitesService {
  constructor(
    private readonly inviteRepository: InviteRepository,
    private readonly partyRepository: PartyRepository,
  ) {}

  private async findResource(
    resource: string,
    createdBy?: string,
  ): Promise<PartyEntity | undefined> {
    const [resourceType, resourceId] = resource.split('-');
    if (resourceType === Model.PARTY) {
      return this.partyRepository.find(resourceId, createdBy);
    }
  }

  async create(
    createInviteDto: CreateInviteDto,
    createdBy: string,
  ): Promise<InviteDto> {
    // Validate the resource was created by the userId from the request
    if (!(await this.findResource(createInviteDto.resourceId, createdBy))) {
      throw new NotFoundException('Resource not found');
    }
    return this.inviteRepository.insert({ ...createInviteDto, createdBy });
  }

  async findPublicInvite(inviteId: string): Promise<PublicInviteDto> {
    const invite = await this.inviteRepository.find(inviteId);
    if (!invite) {
      throw new NotFoundException('Invite not found');
    }
    // Check resource still exists
    const resource = await this.findResource(invite.resourceId);
    if (!resource) {
      throw new NotFoundException('Resource not found');
    }
    // We expect the app to then:
    // Logs the user in if not already logged in
    // Stores sessionId which it uses to redirect after joining as a member (i.e. redirect them to the game)
    return {
      resourceId: invite.resourceId,
      description: resource.partyName,
      sessionId: invite.sessionId,
    };
  }
}
