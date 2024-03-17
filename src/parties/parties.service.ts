import { Injectable } from '@nestjs/common';
import { CreatePartyDto } from './dto/create-party.dto';
import { PartyDto } from './dto/party.dto';
import { App } from '@/types/enums/app.enum';

@Injectable()
export class PartiesService {
  constructor() {}

  create(createPartyDto: CreatePartyDto): Promise<PartyDto> {
    // Create a new party, and automatically joins the new party
    return 'This action adds a new party' as any;
  }

  findAll(app: App): Promise<PartyDto[]> {
    // Lookup parties the user is a member of: modelId=member-user-{userId} where uid begins with party-{app}-
    return `This action returns all parties` as any;
  }
}
