// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Signal } from '@angular/core';

export interface RunSnapshot {
  keys: ReadonlySet<string>;
  runResult: Signal<unknown>;
  resultAtCapture: unknown;
}
