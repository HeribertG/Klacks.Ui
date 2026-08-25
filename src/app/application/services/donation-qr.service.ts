// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Builds Swiss QR-bill and EPC QR payloads for donation transfers to the
 * Klacks developer account and renders them as PNG data URLs.
 *
 * - Swiss QR (SIX "Implementation Guidelines QR-Rechnung") for CHF/EUR
 *   payments from Switzerland/Liechtenstein.
 * - EPC QR (EPC069-12, "GiroCode") for SEPA EUR payments from Europe.
 */
import { Injectable } from '@angular/core';
import QRCode from 'qrcode';

@Injectable({ providedIn: 'root' })
export class DonationQrService {
  public static readonly IBAN_DISPLAY = 'CH28 0900 0000 3004 8187 7';
  public static readonly IBAN_COMPACT = 'CH2809000000300481877';
  public static readonly RECIPIENT_NAME = 'Heribert Gasparoli';
  public static readonly BIC = 'POFICHBEXXX';
  public static readonly PURPOSE = 'Spende Klacks';

  private static readonly RECIPIENT_ADDRESS = {
    street: 'Kirchstrasse',
    houseNumber: '52',
    postalCode: '3097',
    town: 'Liebefeld',
    country: 'CH',
  };

  public buildSwissQrPayload(amount: number, currency: 'CHF' | 'EUR'): string {
    const lines = [
      'SPC',
      '0200',
      '1',
      DonationQrService.IBAN_COMPACT,
      'S',
      DonationQrService.RECIPIENT_NAME,
      DonationQrService.RECIPIENT_ADDRESS.street,
      DonationQrService.RECIPIENT_ADDRESS.houseNumber,
      DonationQrService.RECIPIENT_ADDRESS.postalCode,
      DonationQrService.RECIPIENT_ADDRESS.town,
      DonationQrService.RECIPIENT_ADDRESS.country,
      // Ultimate creditor (lines 12-18): reserved, empty
      '', '', '', '', '', '', '',
      this.formatAmount(amount),
      currency,
      // Ultimate debtor (lines 21-27): reserved, empty
      '', '', '', '', '', '', '',
      'NON',
      '',
      DonationQrService.PURPOSE,
      'EPD',
      // SWICO info + alternative schemes (lines 32-34): empty
      '', '', '',
    ];

    return lines.join('\n');
  }

  public buildEpcPayload(amount: number): string {
    const lines = [
      'BCD',
      '002',
      '1',
      'SCT',
      DonationQrService.BIC,
      DonationQrService.RECIPIENT_NAME,
      DonationQrService.IBAN_COMPACT,
      `EUR${this.formatAmount(amount)}`,
      '',
      '',
      DonationQrService.PURPOSE,
    ];

    return lines.join('\n');
  }

  public toDataUrl(payload: string): Promise<string> {
    return QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 256,
    });
  }

  public formatAmount(amount: number): string {
    return amount.toFixed(2);
  }
}
