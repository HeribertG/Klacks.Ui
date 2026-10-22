// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { WhisperOperationInfo } from './whisper-operation-info.interface';

export interface WhisperPluginStatus {
  installed: boolean;
  modelAlias: string | null;
  modelId: string | null;
  activeOperation: WhisperOperationInfo | null;
  lastOperation: WhisperOperationInfo | null;
  otherOperationActive: boolean;
  supportedAliases?: string[];
  parakeetLanguages?: string[];
}
