// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ElementRef, Signal, TemplateRef } from '@angular/core';

export interface ContractEditorViews {
  contractModal: Signal<TemplateRef<unknown>>;
  containerBox: Signal<ElementRef | undefined>;
}
