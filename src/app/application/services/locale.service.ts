// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, signal } from '@angular/core';
import { DomainMessages } from 'src/app/domain/constants/messages';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  public locale = signal<string>(DomainMessages.DEFAULT_LANG);

  setLocale(locale: string) {
    this.locale.set(locale);
  }

  getLocale(): string {
    return this.locale();
  }
}
