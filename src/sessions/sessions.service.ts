import { Injectable } from '@nestjs/common';
import { UpdateSessionDto } from './dto/update-session.dto';
import { SessionDto } from './dto/session.dto';
import { SessionWithPartiesDto } from './dto/session-with-parties.dto';

@Injectable()
export class SessionsService {
  constructor() {}

  async findOne(sessionId: string): Promise<SessionWithPartiesDto> {
    // return {
    //   ...session,
    //   parties: { partyId: { members: { userId: { ...userSession } } } },
    // };
    // - authenticated endpoint
    // - returns game session for the game for the authenticated user
    // - Lookup parties the user is a member of for the app type
    // - For each party, lookup party members
    // - For each member (except self), lookup session state and return
    // - lookup game for user: modelId=game-{gameid} uid={userId}
    // - { ...session, parties: { [partyId]: { members: { [userId]: session } } } }
    return `This action returns a #${sessionId} session` as any;
  }

  update(
    sessionId: string,
    updateSessionDto: UpdateSessionDto,
  ): Promise<SessionDto> {
    // parse sessionId
    // sessionId: e.g. {appId}-1 (i.e. sudoku game 1)
    // reject if app not in enum, and if the id is not expected format
    // - check state payload is expected for the app type
    // - authenticated endpoint
    // - upsert game state for user
    // // ensure we don't update createdAt
    // #createdAt = if_not_exists(#createdAt, :createdAt)
    return `This action updates a #${sessionId} session` as any;
  }
}
