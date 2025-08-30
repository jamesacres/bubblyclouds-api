export interface AppConfig {
  apiKeys?: { [username: string]: { password: string } | undefined };
  adminUsers?: string[];
  codes?: {
    lifetime?: string[];
    oneYear?: string[];
  };
  revenueCat?: {
    apiKey: string;
  };
}
