export interface AppConfig {
  apiKeys: { [username: string]: { password: string } | undefined };
}
