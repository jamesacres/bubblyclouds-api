import { createPublicKey } from 'crypto';

let publicKey: string;

export const fetchPublicKey = async (): Promise<string> => {
  if (!publicKey) {
    console.info('fetchPublicKey fetching..');
    const response = await fetch('https://auth.bubblyclouds.com/jwks');
    const jwks = await response.json();
    const key = createPublicKey({
      key: jwks.keys.find(
        (key: JsonWebKey) => key.kty === 'RSA' && key.use === 'sig',
      ),
      format: 'jwk',
    });
    publicKey = key.export({ type: 'pkcs1', format: 'pem' }).toString();
    console.info('fetchPublicKey finished');
  }
  return publicKey;
};
