import { AppConfig } from '@/types/interfaces/appConfig';

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
    } else {
      // Running without lambda, use process.env overrides
      console.warn('Skipping app config, using overrides');
      appConfig = overide(undefined);
    }

    console.info('fetchAppConfig finished');
  }
  return appConfig;
};
