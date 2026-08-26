// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Footer component displaying legal links (imprint, privacy policy),
 * a donation link opening a donation dialog (Swiss QR / EPC QR with
 * predefined amounts and copy fallback), and a link to the external
 * documentation.
 */
import { Component, ChangeDetectionStrategy, TemplateRef, inject, signal, viewChild } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { DonationQrService } from 'src/app/application/services/donation-qr.service';
import { DonationCheckoutService } from 'src/app/application/services/donation-checkout.service';
import { DonationConfigService, DonationCurrency } from 'src/app/application/services/donation-config.service';

const MAX_DONATION_AMOUNT = 999999999.99;
const COPY_FEEDBACK_DURATION_MS = 2000;

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  standalone: true,
  imports: [RouterModule, TranslateModule, NgbModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  private readonly ngbModal = inject(NgbModal);
  private readonly donationQrService = inject(DonationQrService);
  private readonly donationCheckoutService = inject(DonationCheckoutService);
  private readonly translate = inject(TranslateService);

  public readonly donationConfig = inject(DonationConfigService);
  readonly donationModal = viewChild.required('donationModal', { read: TemplateRef });

  public readonly amountOptions = [5, 10, 25, 50];
  public readonly donationCurrency = signal<DonationCurrency>('CHF');
  public readonly selectedAmount = signal<number>(25);
  public readonly customAmount = signal<string>('');
  public readonly qrDataUrl = signal<string>('');
  public readonly copiedKey = signal<string>('');
  public readonly checkoutError = signal<string>('');

  openDonation(): void {
    this.donationCurrency.set('CHF');
    this.selectedAmount.set(25);
    this.customAmount.set('');
    this.copiedKey.set('');
    this.checkoutError.set('');
    void this.refreshQr();
    this.ngbModal.open(this.donationModal(), { size: 'md', centered: true });
  }

  paypalUrl(): string {
    return this.donationConfig.paypalMeUrl(this.effectiveAmount(), this.donationCurrency());
  }

  stripeLinkUrl(): string {
    return this.donationConfig.stripePaymentLink(this.effectiveAmount(), this.donationCurrency());
  }

  twintLinkUrl(): string {
    return this.donationConfig.twintLinkUrl;
  }

  async openDonationCheckout(): Promise<void> {
    this.checkoutError.set('');
    try {
      const response = await this.donationCheckoutService.createCheckoutSession(
        this.effectiveAmount(),
        this.donationCurrency()
      );
      if (response.url) {
        window.location.href = response.url;
      } else {
        this.checkoutError.set(response.errorMessage ?? this.translate.instant('donation.checkout-error'));
      }
    } catch {
      this.checkoutError.set(this.translate.instant('donation.checkout-error'));
    }
  }

  selectCurrency(currency: DonationCurrency): void {
    this.donationCurrency.set(currency);
    this.customAmount.set('');
    void this.refreshQr();
  }

  selectAmount(amount: number): void {
    this.customAmount.set('');
    this.selectedAmount.set(amount);
    void this.refreshQr();
  }

  isSelectedAmount(amount: number): boolean {
    return this.customAmount() === '' && this.selectedAmount() === amount;
  }

  onCustomAmount(value: string): void {
    this.customAmount.set(value);
    void this.refreshQr();
  }

  effectiveAmount(): number {
    const parsed = Number(this.customAmount().replace(',', '.'));
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= MAX_DONATION_AMOUNT) {
      return parsed;
    }
    return this.selectedAmount();
  }

  copyIban(): void {
    void this.copyText('IBAN', DonationQrService.IBAN_DISPLAY);
  }

  copyAmount(): void {
    void this.copyText(
      'AMOUNT',
      `${this.donationQrService.formatAmount(this.effectiveAmount())} ${this.donationCurrency()}`
    );
  }

  copyPurpose(): void {
    void this.copyText('PURPOSE', DonationQrService.PURPOSE);
  }

  private async refreshQr(): Promise<void> {
    const amount = this.effectiveAmount();
    const currency = this.donationCurrency();
    const payload =
      currency === 'CHF'
        ? this.donationQrService.buildSwissQrPayload(amount, currency)
        : this.donationQrService.buildEpcPayload(amount);

    try {
      this.qrDataUrl.set(await this.donationQrService.toDataUrl(payload));
    } catch {
      this.qrDataUrl.set('');
    }
  }

  private async copyText(key: string, text: string): Promise<void> {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        this.copyTextFallback(text);
      }
      this.copiedKey.set(key);
      setTimeout(() => this.copiedKey.set(''), COPY_FEEDBACK_DURATION_MS);
    } catch {
      /* clipboard unavailable - ignore */
    }
  }

  private copyTextFallback(text: string): void {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}
