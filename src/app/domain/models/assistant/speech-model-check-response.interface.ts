// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ISpeechModelCheckDto } from './speech-model-check-dto.interface';

export interface ISpeechModelCheckResponse {
  models: ISpeechModelCheckDto[];
}
