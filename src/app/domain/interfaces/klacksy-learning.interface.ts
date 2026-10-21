// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export type LearnedPhraseSource = 'learned' | 'description';

export type LearnedPhraseStatus = 'active' | 'pending' | 'applied_auto' | 'blocked_regression';

export interface ILearnedPhrase {
  id: string;
  skillName: string;
  language: string;
  phrase: string;
  learnedAt: string;
  quote: number | null;
  uses: number | null;
  source: LearnedPhraseSource;
  status: LearnedPhraseStatus;
}
