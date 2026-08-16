// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Profile card where users manage their own messenger channels: see which channels are linked, which
 * one is the preferred one, ask for a pairing code and drop a channel again.
 * There is no input field for the channel identifier on purpose. A Telegram chat id is not known to
 * the user or to an administrator, so a form could not fill it correctly - the user sends the code to
 * the bot instead and the inbound path writes the identifier it actually observed.
 * @param dataService - API service for the user's own messenger channels
 * @param toastService - Plugin toast notification service
 * @param translate - Translation service used for toast texts
 * @param cdr - Change detector, since the card runs OnPush and updates after async calls
 */

import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { PLUGIN_TOAST_SERVICE } from 'klacks-plugin-contracts';
import { DataUserMessengerContactService } from '../../services/data-user-messenger-contact.service';
import {
  UserMessengerContact,
  UserMessengerPairingCode,
} from '../../models/user-messenger-contact.model';
import { MESSENGER_TYPE_LABELS } from '../../enums/messenger-type.enum';

const TRANSLATION_PREFIX = 'settings.user-messengers.';
const TOAST_SUCCESS_TITLE = 'TOAST_SUCCESS';

@Component({
  selector: 'lib-user-messengers',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './user-messengers.component.html',
  styleUrls: ['./user-messengers.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserMessengersComponent implements OnInit {
  private dataService = inject(DataUserMessengerContactService);
  private toastService = inject(PLUGIN_TOAST_SERVICE);
  private translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  contacts = signal<UserMessengerContact[]>([]);
  pairingCode = signal<UserMessengerPairingCode | null>(null);
  isLoading = signal(false);
  isIssuingCode = signal(false);

  ngOnInit(): void {
    this.load();
  }

  channelLabel(contact: UserMessengerContact): string {
    return MESSENGER_TYPE_LABELS[contact.type] ?? String(contact.type);
  }

  async onCreatePairingCode(): Promise<void> {
    this.isIssuingCode.set(true);
    try {
      const issued = await firstValueFrom(this.dataService.createPairingCode());
      this.pairingCode.set(issued);
    } catch {
      this.toastService.showError(this.translate.instant(`${TRANSLATION_PREFIX}error.create-code`));
    } finally {
      this.isIssuingCode.set(false);
      this.cdr.markForCheck();
    }
  }

  /**
   * The code has to reach a chat window, so it must be copyable rather than only readable. Where the
   * clipboard is unavailable the code stays selectable on screen and nothing is claimed to the user.
   */
  async onCopyCode(): Promise<void> {
    const code = this.pairingCode()?.code;
    if (!code || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      this.toastService.showSuccess(
        this.translate.instant(`${TRANSLATION_PREFIX}success.copied`),
        this.translate.instant(TOAST_SUCCESS_TITLE),
      );
    } catch {
      this.toastService.showError(this.translate.instant(`${TRANSLATION_PREFIX}error.copy`));
    }
  }

  async onDelete(contact: UserMessengerContact): Promise<void> {
    try {
      await firstValueFrom(this.dataService.deleteContact(contact.id));
      this.contacts.update(list => list.filter(c => c.id !== contact.id));
      this.toastService.showSuccess(
        this.translate.instant(`${TRANSLATION_PREFIX}success.delete`),
        this.translate.instant(TOAST_SUCCESS_TITLE),
      );
    } catch {
      this.toastService.showError(this.translate.instant(`${TRANSLATION_PREFIX}error.delete`));
    } finally {
      this.cdr.markForCheck();
    }
  }

  private load(): void {
    this.isLoading.set(true);
    this.dataService.getMyContacts().subscribe({
      next: list => {
        this.contacts.set(list);
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastService.showError(this.translate.instant(`${TRANSLATION_PREFIX}error.load`));
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }
}
