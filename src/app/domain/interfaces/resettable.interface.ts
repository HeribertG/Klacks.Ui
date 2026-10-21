// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Signal } from '@angular/core';

export interface IResettable {
  resetData(): void;
  readonly isReset: Signal<boolean>;
}
