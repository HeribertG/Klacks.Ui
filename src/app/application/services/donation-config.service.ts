// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Read-only access to the donation payment provider configuration
 * (PayPal.Me, Stripe Payment Links, Stripe Checkout, TWINT).
 *
 * The values live in the environment files. Sections whose values are empty
 * or disabled are automatically hidden in the donation dialog.
 */
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

export type DonationCurrency = 'CHF' | 'EUR';

export interface DonationStripePaymentLink {
  currency: DonationCurrency;
  amount: number;
  url: string;
}

@Injectable({ providedIn: 'root' })
export class DonationConfigService {
  private readonly config = environment.donation;

  public get paypalMeEnabled(): boolean {
    return this.config.paypalMeBaseUrl.trim().length > 0;
  }

  public get stripeCheckoutEnabled(): boolean {
    return this.config.stripePublishableKey.trim().length > 0;
  }

  public get twintEnabled(): boolean {
    return this.config.twintEnabled;
  }

  public paypalMeUrl(amount: number, currency: DonationCurrency): string {
    const base = this.config.paypalMeBaseUrl.replace(/\/+$/, '');
    return `${base}/${amount}${currency}`;
  }

  public stripePaymentLink(amount: number, currency: DonationCurrency): string {
    const link = this.config.stripePaymentLinks.find(
      (entry) => entry.currency === currency && entry.amount === amount
    );
    return link?.url ?? '';
  }

  public get twintLinkUrl(): string {
    return this.config.twintLinkUrl.trim();
  }
}
