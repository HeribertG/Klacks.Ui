// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { WhisperModelAliases } from '../../constants/whisper-model-aliases.constants';

export type WhisperModelAlias = (typeof WhisperModelAliases)[keyof typeof WhisperModelAliases];
