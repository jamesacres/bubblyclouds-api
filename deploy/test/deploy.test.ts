import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ApiStack } from '../lib/api-stack';

/**
 * Lambda asset bundles are content hashed, so their S3Key changes whenever the
 * source changes. Only those keys are wildcarded - everything else is compared
 * literally, so adding or removing a resource fails the snapshot.
 */
const ASSET_CODE_RESOURCES = [
  'ApiFunctionCE271BD4',
  'ExportLambdaDBBFE402',
  'AggregatorLambda836C2B04',
  'CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F',
];

function buildTemplate() {
  const app = new App();
  const apiStack = new ApiStack(app, 'ApiStack', {
    env: {
      account: '12345678',
      region: 'eu-west-2',
    },
    certificateArn: 'mockCertificateArn',
    domainName: 'mockdomain.test',
    subdomain: 'mocksubdomain',
    appConfig: {
      applicationName: 'mockapplicationname',
      environmentName: 'mockenvironmentname',
    },
    cron: {
      username: 'mockUsername',
      password: 'mockPassword',
    },
  });
  return Template.fromStack(apiStack);
}

describe('Api Stack', () => {
  const template = buildTemplate();

  it('matches the synthesized template', () => {
    const json = template.toJSON();

    const propertyMatchers = {
      Resources: Object.fromEntries(
        ASSET_CODE_RESOURCES.map((id) => [
          id,
          { Properties: { Code: { S3Key: expect.any(String) } } },
        ]),
      ),
    };

    expect(json).toMatchSnapshot(propertyMatchers);
  });

  it('schedules the sudoku cron jobs', () => {
    const apiUrl = 'https://mocksubdomain.mockdomain.test';

    for (const difficulty of ['simple', 'easy', 'intermediate']) {
      template.hasResourceProperties('AWS::Events::ApiDestination', {
        InvocationEndpoint: `${apiUrl}/sudoku/ofTheDay?difficulty=${difficulty}&isTomorrow=true`,
        HttpMethod: 'GET',
      });
    }

    template.hasResourceProperties('AWS::Events::ApiDestination', {
      InvocationEndpoint: `${apiUrl}/sudoku/bookOfTheMonth?isNextMonth=true`,
      HttpMethod: 'GET',
    });
  });

  it('schedules the unblock race cron jobs', () => {
    const apiUrl = 'https://mocksubdomain.mockdomain.test';

    // One rule covers every difficulty: ofTheDay returns all five puzzles.
    template.hasResourceProperties('AWS::Events::ApiDestination', {
      InvocationEndpoint: `${apiUrl}/unblockRace/ofTheDay?isTomorrow=true`,
      HttpMethod: 'GET',
    });
    template.hasResourceProperties('AWS::Events::Rule', {
      ScheduleExpression: 'cron(05 22 * * ? *)',
    });

    template.hasResourceProperties('AWS::Events::ApiDestination', {
      InvocationEndpoint: `${apiUrl}/unblockRace/collectionOfTheMonth?isNextMonth=true`,
      HttpMethod: 'GET',
    });
    // Generated on the 27th so the collection is ready before the month turns.
    template.hasResourceProperties('AWS::Events::Rule', {
      ScheduleExpression: 'cron(06 22 27 * ? *)',
    });
  });

  it('does not overlap cron schedules', () => {
    const rules = template.findResources('AWS::Events::Rule');
    const schedules = Object.values(rules)
      .map((rule) => rule.Properties?.ScheduleExpression)
      .filter(Boolean);

    expect(new Set(schedules).size).toBe(schedules.length);
  });

  it('lets the api read the static bucket', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(['s3:GetObject*']),
            Effect: 'Allow',
          }),
        ]),
      },
    });
  });

  it('points the api at the static bucket for puzzle data', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'Api',
      Environment: {
        Variables: Match.objectLike({
          UNBLOCK_RACE_KEY: 'unblock-race/puzzles.bin',
        }),
      },
    });
  });
});
