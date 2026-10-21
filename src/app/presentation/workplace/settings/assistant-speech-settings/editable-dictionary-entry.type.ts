// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { DictionaryEntry } from 'src/app/domain/models/assistant/dictionary-entry.interface';

export type EditableDictionaryEntry = Omit<DictionaryEntry, 'language'> & {
  language: string;
};
