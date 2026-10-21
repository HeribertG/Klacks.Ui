// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { WhisperModelAlias } from 'src/app/domain/models/assistant/whisper-model-alias.type';

export interface WhisperModelOption {
  value: WhisperModelAlias;
  labelKey: string;
  hintKey: string;
}
