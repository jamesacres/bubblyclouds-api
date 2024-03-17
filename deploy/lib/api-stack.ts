import { Duration, Fn, Stack, StackProps } from 'aws-cdk-lib';
import {
  CfnApplication,
  CfnConfigurationProfile,
  CfnEnvironment,
} from 'aws-cdk-lib/aws-appconfig';
import {
  DomainName,
  EndpointType,
  LambdaIntegration,
  MethodLoggingLevel,
  RestApi,
  SecurityPolicy,
} from 'aws-cdk-lib/aws-apigateway';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { AttributeType, ProjectionType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Code, Function, LayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

export interface ApiStackProps extends StackProps {
  certificateArn: string;
  domainName: string;
  subdomain: string;
  appConfig: { applicationName: string; environmentName: string };
}

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);
    const { certificateArn, domainName, subdomain } = props;

    const apiGateway = this.gateway();
    this.domain(apiGateway, {
      certificateArn,
      domainName,
      subdomain,
    });

    const appConfig = this.appConfig(props.appConfig);
    const { api } = this.lambdas({
      appConfig,
      accountId: props.env!.account!,
      region: props.env!.region!,
    });

    const { table } = this.dynamodb();
    table.grantReadWriteData(api.fn);

    // GET *
    apiGateway.root.addProxy({ defaultIntegration: api.integration });
  }

  private gateway() {
    return new RestApi(this, 'ApiGateway', {
      restApiName: 'ApiGateway',
      deployOptions: {
        metricsEnabled: true,
        loggingLevel: MethodLoggingLevel.ERROR,
        tracingEnabled: true,
      },
      cloudWatchRole: true,
      endpointTypes: [EndpointType.EDGE],
    });
  }

  private domain(
    apiGateway: RestApi,
    {
      certificateArn,
      domainName,
      subdomain,
    }: {
      certificateArn: string;
      domainName: string;
      subdomain: string;
    },
  ) {
    const certificate = Certificate.fromCertificateArn(
      this,
      'Certificate',
      certificateArn,
    );
    const domain = new DomainName(this, 'ApiDomain', {
      certificate,
      domainName: `${subdomain}.${domainName}`,
      securityPolicy: SecurityPolicy.TLS_1_2,
      endpointType: EndpointType.EDGE,
    });
    domain.addBasePathMapping(apiGateway);
  }

  private dynamodb() {
    const table = new Table(this, 'ApiTable', {
      partitionKey: { name: 'modelId', type: AttributeType.STRING },
      sortKey: { name: 'owner', type: AttributeType.STRING },
      pointInTimeRecovery: true,
      timeToLiveAttribute: 'expiresAt',
      deletionProtection: true,
    });

    // As per src/dynamodb/dynamodb-adapter.ts define secondary indexes
    table.addGlobalSecondaryIndex({
      indexName: `ownerIndex`,
      partitionKey: { name: 'owner', type: AttributeType.STRING },
      sortKey: { name: 'modelId', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    return { table };
  }

  private appConfig(options: ApiStackProps['appConfig']): {
    application: CfnApplication;
    environment: CfnEnvironment;
    configuration: CfnConfigurationProfile;
  } {
    const application = new CfnApplication(this, `ApiAppConfigApplication`, {
      name: options.applicationName,
    });
    const environment = new CfnEnvironment(this, 'ApiAppConfigEnvironment', {
      applicationId: application.ref,
      name: options.environmentName,
    });
    const configuration = new CfnConfigurationProfile(
      this,
      `ApiAppConfigConfigurationProfile`,
      {
        applicationId: application.ref,
        locationUri: 'hosted',
        name: options.environmentName,
        type: 'AWS.Freeform',
      },
    );
    return {
      application,
      environment,
      configuration,
    };
  }

  private lambdas(options: {
    accountId: string;
    region: string;
    appConfig: {
      application: CfnApplication;
      environment: CfnEnvironment;
      configuration: CfnConfigurationProfile;
    };
  }) {
    const apiFn = new Function(this, `ApiFunction`, {
      handler: 'main.handler',
      memorySize: 128,
      runtime: Runtime.NODEJS_20_X,
      timeout: Duration.seconds(15),
      logRetention: RetentionDays.ONE_WEEK,
      code: Code.fromAsset('../dist'),
      functionName: `Api`,
      environment: {
        API_TABLE: 'ApiStack-ApiTable21517941-1JLBDQLD4OA69',
        // https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-integration-lambda-extensions.html
        AWS_APPCONFIG_EXTENSION_PREFETCH_LIST: Fn.sub(
          '/applications/${applicationId}/environments/${environmentId}/configurations/${configurationId}',
          {
            applicationId: options.appConfig.application.name,
            environmentId: options.appConfig.environment.name,
            configurationId: options.appConfig.configuration.name,
          },
        ),
      },
      layers: [
        LayerVersion.fromLayerVersionArn(
          this,
          'AppConfigLambdaLayer',
          'arn:aws:lambda:eu-west-2:282860088358:layer:AWS-AppConfig-Extension:93',
        ),
      ],
    });
    apiFn.addToRolePolicy(
      new PolicyStatement({
        resources: [
          Fn.sub(
            'arn:aws:appconfig:${region}:${accountId}:application/${applicationId}/environment/${environmentId}/configuration/${configurationId}',
            {
              region: options.region,
              accountId: options.accountId,
              applicationId: options.appConfig.application.ref,
              environmentId: options.appConfig.environment.ref,
              configurationId: options.appConfig.configuration.ref,
            },
          ),
        ],
        actions: [
          'appconfig:GetLatestConfiguration',
          'appconfig:StartConfigurationSession',
        ],
      }),
    );

    return {
      api: {
        fn: apiFn,
        integration: new LambdaIntegration(apiFn, { proxy: true }),
      },
    };
  }
}
