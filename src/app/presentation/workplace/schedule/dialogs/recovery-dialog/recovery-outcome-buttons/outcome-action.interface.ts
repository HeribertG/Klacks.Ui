// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ReplacementRequestOutcome } from 'src/app/domain/enums/replacement-request-outcome.enum';

export interface IOutcomeAction {
  outcome: ReplacementRequestOutcome;
  labelKey: string;
  activeClass: string;
  idleClass: string;
}
