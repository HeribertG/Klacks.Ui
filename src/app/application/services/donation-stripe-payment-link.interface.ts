// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { DonationCurrency } from './donation-currency.type';

export interface DonationStripePaymentLink {
  currency: DonationCurrency;
  amount: number;
  url: string;
}
