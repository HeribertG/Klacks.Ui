// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IToastAction } from './toast-action.interface';

export interface IErrorToastOptions {
  additionalMessage?: string;
  icon?: string;
  actions?: IToastAction[];
}
