// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { WhisperModelAliases } from './whisper-model-aliases.constants';

export const LocalSttPlugin = {
  ProviderId: '7f3d2a10-0000-4000-8000-57705731a001',
  CardElementId: 'settings-whisper-plugin',
} as const;

export const LocalSttEngineNames: Readonly<Record<string, string>> = {
  [WhisperModelAliases.Parakeet]: 'Parakeet',
  [WhisperModelAliases.Small]: 'Whisper small',
  [WhisperModelAliases.LargeV3Turbo]: 'Whisper turbo',
};
