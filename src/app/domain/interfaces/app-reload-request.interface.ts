// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { AppReloadReason } from 'src/app/domain/enums/app-reload-reason.enum';

export interface IAppReloadRequest {
  reason: AppReloadReason;
  targetUrl?: string;
  autoReloadAllowed: boolean;
}
