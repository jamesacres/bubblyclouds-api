import { AppConfig } from '@/types/interfaces/appConfig';
import {
  AppConfigDataClient,
  GetLatestConfigurationCommand,
  StartConfigurationSessionCommand,
} from '@aws-sdk/client-appconfigdata';

let appConfig: AppConfig;

const overide = (appConfig: AppConfig | undefined): AppConfig => {
  return {
    ...appConfig,
    apiKeys: {
      ...appConfig?.apiKeys,
      ...(process.env.APP_CONFIG_API_KEY_USERNAME &&
      process.env.APP_CONFIG_API_KEY_PASSWORD
        ? {
            [process.env.APP_CONFIG_API_KEY_USERNAME]: {
              password: process.env.APP_CONFIG_API_KEY_PASSWORD,
            },
          }
        : {}),
    },
  };
};

export const fetchAppConfig = async (): Promise<AppConfig> => {
  if (!appConfig) {
    console.info('fetchAppConfig fetching..');

    if (process.env.AWS_APPCONFIG_EXTENSION_PREFETCH_LIST) {
      // Fetch using lambda layer
      appConfig = await fetch(
        `http://localhost:2772${process.env.AWS_APPCONFIG_EXTENSION_PREFETCH_LIST}`,
      ).then(async (res) => {
        const response = await res.json();
        if (!res.ok) {
          throw Error(response);
        }
        return overide(response);
      });
    } else if (
      process.env.APP_CONFIG_APPLICATION_ID &&
      process.env.APP_CONFIG_ENVIRONMENT_ID &&
      process.env.APP_CONFIG_CONFIGURATION_ID
    ) {
      // Running without lambda but have app config
      const client = new AppConfigDataClient({ region: 'eu-west-2' });
      const configurationToken = (
        await client.send(
          new StartConfigurationSessionCommand({
            ApplicationIdentifier: process.env.APP_CONFIG_APPLICATION_ID,
            EnvironmentIdentifier: process.env.APP_CONFIG_ENVIRONMENT_ID,
            ConfigurationProfileIdentifier:
              process.env.APP_CONFIG_CONFIGURATION_ID,
          }),
        )
      ).InitialConfigurationToken;
      const response = await client.send(
        new GetLatestConfigurationCommand({
          ConfigurationToken: configurationToken,
        }),
      );
      appConfig = overide(
        response.Configuration
          ? (JSON.parse(
              new TextDecoder().decode(response.Configuration),
            ) as AppConfig)
          : undefined,
      );
    } else {
      // Running without lambda or app config, use process.env overrides
      console.warn('Skipping app config, using overrides');
      appConfig = overide(undefined);
    }

    console.info('fetchAppConfig finished');
  }
  return appConfig;
};
