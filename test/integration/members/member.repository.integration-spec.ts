/**
 * Integration tests for MemberRepository against a local DynamoDB instance.
 *
 * Prerequisites:
 *   - Local DynamoDB running at http://localhost:8000
 *     e.g. `npm run dynamodb:start` or
 *          `docker run -p 8000:8000 amazon/dynamodb-local`
 *
 * Run with: npm run test:integration
 */
import { TestingModule } from '@nestjs/testing';
import { MemberRepository } from '@/members/repository/member.repository';
import { Model } from '@/types/enums/model';
import { setupDynamoDB, teardownDynamoDB, clearTable } from '../setup/dynamodb';
import { createIntegrationModule } from '../setup/testModule';

jest.setTimeout(60000);

describe('MemberRepository (integration)', () => {
  let moduleRef: TestingModule;
  let memberRepository: MemberRepository;

  beforeAll(async () => {
    await setupDynamoDB();
    moduleRef = await createIntegrationModule([MemberRepository]);
    memberRepository = moduleRef.get(MemberRepository);
  });

  afterAll(async () => {
    await moduleRef?.close();
    await teardownDynamoDB();
  });

  beforeEach(async () => {
    await clearTable();
  });

  it('adds members and lists them for a resource, oldest first', async () => {
    await memberRepository.insert({
      userId: 'member-a',
      resourceId: `${Model.PARTY}-p-members`,
      memberNickname: 'Alice',
    });
    await new Promise((r) => setTimeout(r, 1100));
    await memberRepository.insert({
      userId: 'member-b',
      resourceId: `${Model.PARTY}-p-members`,
      memberNickname: 'Bob',
    });

    const members = await memberRepository.findAllMembersForResource(
      `${Model.PARTY}-p-members`,
    );
    expect(members.map((m) => m.memberNickname)).toEqual(['Alice', 'Bob']);
  });

  it('finds a specific membership and lists memberships for a user', async () => {
    await memberRepository.insert({
      userId: 'user-x',
      resourceId: `${Model.PARTY}-p1`,
      memberNickname: 'X',
    });

    const found = await memberRepository.findForUser(
      'user-x',
      Model.PARTY,
      'p1',
    );
    expect(found?.memberNickname).toBe('X');

    const forUser = await memberRepository.findAllForUser('user-x', {
      type: Model.PARTY,
    });
    expect(forUser).toHaveLength(1);
    expect(forUser[0].resourceId).toBe(`${Model.PARTY}-p1`);
  });

  it('destroys a membership', async () => {
    const member = await memberRepository.insert({
      userId: 'user-del',
      resourceId: `${Model.PARTY}-pd`,
      memberNickname: 'Del',
    });
    await memberRepository.destroy(member);
    const found = await memberRepository.findForUser(
      'user-del',
      Model.PARTY,
      'pd',
    );
    expect(found).toBeUndefined();
  });
});
