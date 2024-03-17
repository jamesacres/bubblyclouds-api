export interface User {
  jti: string;
  sub: string;
  iat: number;
  exp: number;
  scope: string;
  client_id: string;
  iss: string;
  aud: string;
}
