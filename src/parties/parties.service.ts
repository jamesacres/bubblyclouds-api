import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePartyDto } from './dto/create-party.dto';
import { PartyDto } from './dto/party.dto';
import { App } from '@/types/enums/app.enum';
import { PartyRepository } from './repository/party.repository';
import { MemberRepository } from '@/members/repository/member.repository';
import { Model } from '@/types/enums/model';
import { PartyEntity } from './entities/party.entity';
import { UpdatePartyDto } from './dto/update-party.dto';
import { EntitlementDuration } from '@/types/enums/entitlement-duration.enum';
import { RevenuecatService } from '@/revenuecat/revenuecat.service';
import { Entitlement } from '@/types/enums/entitlement.enum';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '@/types/interfaces/appConfig';

@Injectable()
export class PartiesService {
  constructor(
    private readonly partyRepository: PartyRepository,
    private readonly memberRepository: MemberRepository,
    private readonly revenuecatService: RevenuecatService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  private async calculateEntitlementDuration(
    userId: string,
    partyName: string,
  ): Promise<EntitlementDuration | undefined> {
    const adminUsers =
      this.configService.get<AppConfig['adminUsers']>('adminUsers');
    const codes = this.configService.get<AppConfig['codes']>('codes');
    if (adminUsers?.includes(userId)) {
      console.info(`admin user ${userId}`);
      // Admin give entitlement based on party name
      const { lifetime, oneYear } = codes || {};
      const upperPartyName = partyName.toUpperCase();
      if (lifetime?.some((code) => upperPartyName.includes(code))) {
        return EntitlementDuration.LIFETIME;
      }
      if (oneYear?.some((code) => upperPartyName.includes(code))) {
        return EntitlementDuration.ONE_YEAR;
      }
      return EntitlementDuration.ONE_MONTH;
    }

    const hasPlus = await this.revenuecatService
      .hasEntitlement(userId, Entitlement.PLUS)
      .catch((e) => {
        console.error(e);
        return false;
      });
    if (hasPlus) {
      console.info(`user ${userId} has plus`);
      // If creator has Plus, grant Plus to anyone joining the party
      return EntitlementDuration.ONE_MONTH;
    }

    return undefined;
  }

  async create(
    { appId, partyName, memberNickname, maxSize }: CreatePartyDto,
    createdBy: string,
  ): Promise<PartyDto> {
    // Entitlement given to members joining the party
    const entitlementDuration = await this.calculateEntitlementDuration(
      createdBy,
      partyName,
    ).catch((e) => {
      console.error(e);
      return undefined;
    });
    if (entitlementDuration) {
      console.info(
        `new party will have entitlementDuration ${entitlementDuration}`,
      );
    }

    const party = await this.partyRepository.insert({
      appId,
      partyName,
      createdBy,
      maxSize,
      entitlementDuration,
    });

    // Creator automatically becomes a member
    await this.memberRepository.insert({
      memberNickname,
      resourceId: `${Model.PARTY}-${party.partyId}`,
      userId: createdBy,
    });

    return party;
  }

  async findAllForUser(
    userId: string,
    app: App,
    disableBackoff?: boolean,
  ): Promise<PartyEntity[]> {
    const members = await this.memberRepository.findAllForUser(userId, {
      type: Model.PARTY,
      idPrefix: app,
    });
    const partyIds = members.map((member) =>
      member.resourceId.replace(`${Model.PARTY}-`, ''),
    );

    const parties: PartyEntity[] = [];
    for (const partyId of partyIds) {
      const party = await this.partyRepository.find(
        partyId,
        undefined,
        disableBackoff,
      );
      if (party) {
        parties.push(party);
      }
    }

    return parties;
  }

  async findForUser(
    userId: string,
    app: App,
    partyId: string,
  ): Promise<PartyEntity | undefined> {
    // Confirm user is a member of the party
    const member = await this.memberRepository.findForUser(
      userId,
      Model.PARTY,
      partyId,
    );
    if (member) {
      // Confirm the party exists for this app
      const party = await this.partyRepository.find(partyId);
      if (party && party.appId === app) {
        return party;
      }
    }
  }

  async deleteForUser(
    userId: string,
    app: App,
    partyId: string,
  ): Promise<void> {
    const party = await this.findForUser(userId, app, partyId);
    // Confirm the party was created by this user
    if (party && party.createdBy === userId) {
      await this.partyRepository.destroy(party);
      return;
    }
    throw new NotFoundException('Party not found');
  }

  async updateForUser(
    userId: string,
    app: App,
    partyId: string,
    updatePartyDto: UpdatePartyDto,
  ): Promise<PartyDto> {
    const party = await this.findForUser(userId, app, partyId);
    // Confirm the party was created by this user
    if (party && party.createdBy === userId) {
      return this.partyRepository.update(partyId, {
        ...party,
        ...updatePartyDto,
      });
    }
    throw new NotFoundException('Party not found');
  }
}
