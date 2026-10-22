// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { WhisperOperationInfo } from './whisper-operation-info.interface';

export interface LocalSttStatusView {
  known: boolean;
  unavailable: boolean;
  installed: boolean;
  engineName: string;
  activeOperation: WhisperOperationInfo | null;
  installActive: boolean;
  awaitingUpdater: boolean;
  waitingMinutes: number;
  otherOperationActive: boolean;
  failedInstall: WhisperOperationInfo | null;
}
