/**
 * Plain (non-jest) helpers used by the e2e specs' inline jest.mock factories.
 *
 * These are intentionally NOT jest.mock factories: jest hoists jest.mock above
 * imports, so each spec declares its own jest.mock(...) calls and lazily
 * require()s these helpers from inside the factory (which runs after modules
 * initialise). See any test/e2e/**.e2e-spec.ts for the pattern.
 */

/** Static AppConfig returned during boot to avoid AWS AppConfig network calls. */
export const STATIC_APP_CONFIG = { apiKeys: {} };

/** Inert RevenueCat stub so entitlement calls make no external requests. */
export class RevenuecatServiceStub {
  async hasEntitlement(): Promise<boolean> {
    return false;
  }
  async grantEntitlement(): Promise<void> {
    return undefined;
  }
}
