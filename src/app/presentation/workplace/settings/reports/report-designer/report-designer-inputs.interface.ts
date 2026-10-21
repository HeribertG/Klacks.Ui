// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ModelSignal, Signal } from '@angular/core';
import { ReportTemplate } from 'src/app/domain/models/report/report-template.model';

export interface ReportDesignerInputs {
  template: ModelSignal<ReportTemplate>;
  sourceId: Signal<string>;
  dataSetIds: Signal<string[]>;
  imagePreviewCache: Signal<Map<string, string>>;
  parameterKeys: Signal<string[]>;
}
