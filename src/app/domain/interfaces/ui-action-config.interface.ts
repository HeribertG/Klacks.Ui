// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IUiActionStep } from './ui-action-step.interface';

export interface IUiActionConfig {
  steps: IUiActionStep[];
  onError?: 'stop' | 'continue';
}
