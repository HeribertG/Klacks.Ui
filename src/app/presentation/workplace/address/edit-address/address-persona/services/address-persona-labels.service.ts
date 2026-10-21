// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Language dependent texts of the address persona card: the current language for localized country names and the
 * texts of the address deactivation, reset on every language change.
 * @param destroy$ - Emits when the card is destroyed and ends the language change subscription
 */

import { ChangeDetectorRef, inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable, takeUntil } from 'rxjs';

import { DomainMessages } from 'src/app/domain/constants/messages';
import { Language } from 'src/app/domain/models/settings/language.type';

@Injectable()
export class AddressPersonaLabelsService {
  private translateService = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  message = DomainMessages.DEACTIVE_ADDRESS;
  title = DomainMessages.DEACTIVE_ADDRESS_TITLE;
  newAddressString = DomainMessages.NEW_ADDRESS;
  currentLang: Language = DomainMessages.DEFAULT_LANG;

  initialize(): void {
    this.currentLang = this.translateService.currentLang as Language;
    this.resetTexts();
  }

  connect(destroy$: Observable<void>): void {
    this.translateService.onLangChange
      .pipe(takeUntil(destroy$))
      .subscribe(() => {
        this.currentLang = this.translateService.currentLang as Language;
        queueMicrotask(() => {
          this.resetTexts();
          this.cdr.markForCheck();
        });
      });
  }

  private resetTexts(): void {
    this.message = DomainMessages.DEACTIVE_ADDRESS;
    this.title = DomainMessages.DEACTIVE_ADDRESS_TITLE;
    this.newAddressString = DomainMessages.NEW_ADDRESS;
  }
}
