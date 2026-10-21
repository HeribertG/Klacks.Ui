// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IIndustryTemplate } from 'src/app/domain/models/settings/industry-template.interface';

export type IndustryPreviewStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface IndustryPreviewState {
  status: IndustryPreviewStatus;
  data?: IIndustryTemplate;
}
