/**
 * Test JWT signing for e2e. Generates an RSA key pair once; the public key is
 * exposed to the AuthGuard (via the fetchPublicKey mock) and the private key
 * signs access tokens the guard will accept. The public key is emitted as a
 * pkcs1 PEM to match what src/utils/fetchPublicKey.ts produces at runtime.
 */
import { generateKeyPairSync } from 'crypto';
import * as jwt from 'jsonwebtoken';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

export const TEST_PUBLIC_KEY_PEM = publicKey;

export const AUDIENCE = 'https://api.bubblyclouds.com';
export const ISSUER = 'https://auth.bubblyclouds.com';

export interface SignOptions {
  sub?: string;
  scope?: string;
  clientId?: string;
}

export const signAccessToken = ({
  sub = 'e2e-user',
  scope = 'parties.write members.write invites.write sessions.write',
  clientId = 'bubbly-sudoku',
}: SignOptions = {}): string =>
  jwt.sign(
    {
      jti: `jti-${Math.random().toString(36).slice(2)}`,
      sub,
      scope,
      client_id: clientId,
    },
    privateKey,
    {
      algorithm: 'RS256',
      audience: AUDIENCE,
      issuer: ISSUER,
      expiresIn: '1h',
    },
  );

export const bearer = (opts?: SignOptions) => `Bearer ${signAccessToken(opts)}`;
