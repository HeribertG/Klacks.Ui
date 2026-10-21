// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IBreakPlaceholder } from 'src/app/domain/models/break/break-placeholder.interface';

export interface BreakBarLayout {
  bp: IBreakPlaceholder;
  startCol: number;
  endCol: number;
  subRow: number;
}
