// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export enum EscalationTier {
  InGroupFree = 0,
  InGroupSwap = 1,
  CrossGroupFree = 2,
  CrossGroupSwap = 3,
  Uncovered = 4,
  InGroupOnCall = 5,
  CrossGroupOnCall = 6,
}
