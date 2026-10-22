// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Number of Klacksy navigation targets per synonym status; obsolete targets are counted only as obsolete.
 */
export interface IKlacksyTrainingTargetStatusCounts {
  total: number;
  pending: number;
  generated: number;
  reviewed: number;
  needsReview: number;
  obsolete: number;
}
