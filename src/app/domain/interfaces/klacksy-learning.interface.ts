// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export type LearnedPhraseSource = 'learned' | 'description';

export interface ILearnedPhrase {
  id: string;
  skillName: string;
  language: string;
  phrase: string;
  learnedAt: string;
  quote: number | null;
  uses: number | null;
  source: LearnedPhraseSource;
}

export interface IUpdateLearnedPhraseRequest {
  phrase?: string;
  description?: string;
}

export interface IApproveDescriptionProposalResponse {
  applied: boolean;
  error: string | null;
  newSkillVersion: number | null;
}

export interface ILearnedCapabilityStep {
  skill: string;
  kind: string;
}

export interface ILearnedCapability {
  id: string;
  name: string;
  goal: string;
  steps: ILearnedCapabilityStep[];
  learnedAt: string;
  quote: number | null;
  uses: number | null;
  needsFirstUse: boolean;
}

export interface IUpdateLearnedCapabilityRequest {
  goal: string;
  synonyms?: Record<string, string[]>;
}

export interface IUnfulfillableWish {
  id: string;
  intentExcerpt: string;
  locale: string;
  occurrenceCount: number;
  distinctUserCount: number;
  firstSeen: string;
  lastSeen: string;
  lastError: string | null;
}
