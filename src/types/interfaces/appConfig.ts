import { App } from '../enums/app.enum';

export interface AppConfig {
  apiKeys?: { [username: string]: { password: string } | undefined };
  adminUsers?: string[];
  codes?: {
    lifetime?: string[];
    oneYear?: string[];
  };
  revenueCat?: {
    [app in App]?: { apiKey: string };
  };
}
