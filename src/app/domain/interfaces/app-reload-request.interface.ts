// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { AppReloadReason } from 'src/app/domain/enums/app-reload-reason.enum';

export interface IAppReloadRequest {
  reason: AppReloadReason;
  targetUrl?: string;
  autoReloadAllowed: boolean;
}
