import { EntitlementDuration } from '@/types/enums/entitlement-duration.enum';
import { Entitlement } from '@/types/enums/entitlement.enum';
import { AppConfig } from '@/types/interfaces/appConfig';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { constants } from 'http2';

const TIMEOUT_MS = 20000;

@Injectable()
export class RevenuecatService {
  constructor(readonly configService: ConfigService<AppConfig, true>) {}

  private async fetchApi<T>(
    method: 'GET' | 'POST',
    uri: string,
    body?: object,
  ): Promise<T | undefined> {
    const config =
      this.configService.get<AppConfig['revenueCat']>('revenueCat');
    if (!config?.apiKey) {
      throw Error('fetchApi missing apiKey');
    }
    const response = await fetch(`https://api.revenuecat.com${uri}`, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        'content-type': 'application/json',
      },
    });
    if (
      [
        constants.HTTP_STATUS_NOT_FOUND,
        constants.HTTP_STATUS_NO_CONTENT,
      ].includes(response.status)
    ) {
      return undefined;
    }
    if (response.ok) {
      return response.json() as T;
    } else {
      const errorResponse = await response.json().catch((e) => {
        console.warn(e);
      });
      console.error(errorResponse);
    }
    throw Error('fetchApi unexpected response status');
  }

  public async hasEntitlement(
    userId: string,
    entitlement: Entitlement,
  ): Promise<boolean> {
    const customer = await this.fetchApi<{
      subscriber: {
        entitlements: {
          [key in Entitlement]: { expires_date: string | null };
        };
      };
    }>('GET', `/v1/subscribers/${encodeURIComponent(userId)}`);
    const entitlementDetails = customer?.subscriber.entitlements[entitlement];
    const entitlementActive: boolean =
      !!entitlementDetails &&
      (entitlementDetails.expires_date === null ||
        new Date(entitlementDetails.expires_date) > new Date());
    return entitlementActive;
  }

  public async grantEntitlement(
    userId: string,
    entitlement: Entitlement,
    entitlementDuration: EntitlementDuration,
  ): Promise<void> {
    const length: { end_time_ms?: number; duration?: 'lifetime' } = {};
    if (entitlementDuration === EntitlementDuration.LIFETIME) {
      length.duration = 'lifetime';
    } else if (entitlementDuration === EntitlementDuration.ONE_MONTH) {
      const endTime = new Date();
      endTime.setMonth(endTime.getMonth() + 1);
      length.end_time_ms = endTime.getTime();
    } else if (entitlementDuration === EntitlementDuration.ONE_YEAR) {
      const endTime = new Date();
      endTime.setFullYear(endTime.getFullYear() + 1);
      length.end_time_ms = endTime.getTime();
    }
    await this.fetchApi(
      'POST',
      `/v1/subscribers/${encodeURIComponent(userId)}/entitlements/${encodeURIComponent(entitlement)}/promotional`,
      { ...length },
    );
  }
}
