import { Party } from '../dto/party';

export class PartyEntity implements Party {
  partyId: string;
  appId: string;
  partyName: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;

  constructor({
    partyId,
    appId,
    partyName,
    createdBy,
    createdAt,
    updatedAt,
  }: Party) {
    this.partyId = partyId;
    this.appId = appId;
    this.partyName = partyName;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
