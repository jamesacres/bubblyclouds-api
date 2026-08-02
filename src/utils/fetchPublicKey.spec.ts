describe('fetchPublicKey', () => {
  const realFetch = global.fetch;

  // A valid RSA public JWK to exercise createPublicKey
  const rsaJwk = {
    kty: 'RSA',
    n: 't4sTHWwx6Ia3wDi6LRIRlwF8FXbjZgW38xNFZOCFZhROkSzckD2Xq_HA4e8wVsMDMWPnBgYEjROkNlhQaMJijI-ZRy5m8ZiCYPNmEgvVQBjO8zhV9lLM8uqfA6BAv8BanpJn2RduZrrXTGNGxKISqBscQPYnvtZhrcDa5u1nCa6sDnk_-e2_esE8ZDg1RFZ_sXx1isAA3ecPRMB2QulxdpdAyqYrGj1sh9w2fYw8xUzdc1hw_ckxkx7gu9oZIl-5IlwIuKQV531YYwFm_uyuxBLl1OoLdZ_iBWSOknXlUlDbizSFsx7d5tPvvUrVWrED-jyIwoqc4WIg922sumNbZw',
    e: 'AQAB',
    use: 'sig',
  };

  afterEach(() => {
    global.fetch = realFetch;
    jest.resetModules();
  });

  it('fetches jwks and returns a PEM public key, caching the result', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      json: async () => ({ keys: [rsaJwk] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { fetchPublicKey } = await import('./fetchPublicKey');
    const key = await fetchPublicKey();
    expect(key).toContain('BEGIN RSA PUBLIC KEY');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://auth.bubblyclouds.com/jwks',
    );

    // Second call should be cached (no new fetch)
    const key2 = await fetchPublicKey();
    expect(key2).toBe(key);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('ignores non-signing keys and picks the RSA sig key', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      json: async () => ({
        keys: [{ kty: 'EC', use: 'sig' }, { kty: 'RSA', use: 'enc' }, rsaJwk],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { fetchPublicKey } = await import('./fetchPublicKey');
    const key = await fetchPublicKey();
    expect(key).toContain('BEGIN RSA PUBLIC KEY');
  });
});
