// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface DictionaryEntry {
  id: string;
  correctTerm: string;
  category: string | null;
  phoneticVariants: string[];
  description: string | null;
  language: string | null;
}
