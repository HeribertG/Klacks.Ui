// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { CoreProgressData } from './core-progress-data.interface';
import { CoreResultData } from './core-result-data.interface';

export interface EvolutionCallbacks {
  onProgress: (data: CoreProgressData) => void;
  onResult: (data: CoreResultData) => void;
}
