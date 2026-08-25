// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Backend communication for the Stripe donation checkout. The Stripe secret
 * key stays on the server; this service only forwards amount and currency and
 * receives the hosted checkout URL.
 */
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { DonationCurrency } from './donation-config.service';

export interface DonationCheckoutResponse {
  url?: string;
  errorMessage?: string;
}

@Injectable({ providedIn: 'root' })
export class DonationCheckoutService {
  private readonly http = inject(HttpClient);
  private readonly checkoutUrl = `${environment.baseUrl}Donation/checkout-session`;

  public async createCheckoutSession(
    amount: number,
    currency: DonationCurrency
  ): Promise<DonationCheckoutResponse> {
    return firstValueFrom(
      this.http.post<DonationCheckoutResponse>(this.checkoutUrl, { amount, currency })
    );
  }
}
