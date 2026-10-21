// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ProactiveReaction, ProactiveRejectReason } from 'src/app/domain/constants/proactive-reaction.constants';

export interface ISetProactiveReactionRequest {
  reaction: ProactiveReaction;
  rejectReason?: ProactiveRejectReason;
}
