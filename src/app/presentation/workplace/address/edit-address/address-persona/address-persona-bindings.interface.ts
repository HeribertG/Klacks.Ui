// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { OutputEmitterRef, Signal } from '@angular/core';

export interface AddressPersonaBindings {
  isReadOnly: Signal<boolean>;
  isChangingEvent: OutputEmitterRef<boolean>;
}
