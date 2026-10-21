// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Pure display rules for one escalation chain card: the remaining reaction time, how much of it is left
 * (drives the progress bar and its colour), and whose turn it is now and next.
 * @param chain - The chain summary as delivered by the server
 * @param nowMs - The current instant in epoch milliseconds, injected so the card can tick and tests stay deterministic
 */

import {
  ESCALATION_STAGE_STATUS_NOTIFIED,
  ESCALATION_STAGE_STATUS_PENDING,
  IEscalationStageSummary,
} from 'src/app/domain/interfaces/escalation-chain.interface';
import { EscalationUrgency } from './escalation-urgency.type';
import { IEscalationChainSummary } from 'src/app/domain/interfaces/escalation-chain-summary.interface';

export interface EscalationDuration {
  days: number;
  hours: number;
  minutes: number;
}

const MS_PER_MINUTE = 60000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const PERCENT = 100;
const WARNING_SHARE_LEFT = 0.5;
const CRITICAL_SHARE_LEFT = 0.25;

export function remainingMs(chain: IEscalationChainSummary, nowMs: number): number {
  return Math.max(0, new Date(chain.deadlineUtc).getTime() - nowMs);
}

export function remainingShare(chain: IEscalationChainSummary, nowMs: number): number | null {
  if (!chain.startedAtUtc) {
    return null;
  }

  const totalMs = new Date(chain.deadlineUtc).getTime() - new Date(chain.startedAtUtc).getTime();
  if (totalMs <= 0) {
    return 0;
  }

  return Math.min(1, remainingMs(chain, nowMs) / totalMs);
}

export function remainingPercent(chain: IEscalationChainSummary, nowMs: number): number | null {
  const share = remainingShare(chain, nowMs);
  return share === null ? null : Math.round(share * PERCENT);
}

export function urgency(chain: IEscalationChainSummary, nowMs: number): EscalationUrgency {
  const share = remainingShare(chain, nowMs);
  if (share === null || share > WARNING_SHARE_LEFT) {
    return share === null ? 'warning' : 'calm';
  }

  return share > CRITICAL_SHARE_LEFT ? 'warning' : 'critical';
}

export function splitDuration(ms: number): EscalationDuration {
  const totalMinutes = Math.ceil(ms / MS_PER_MINUTE);
  const totalHours = Math.floor(totalMinutes / MINUTES_PER_HOUR);

  return {
    days: Math.floor(totalHours / HOURS_PER_DAY),
    hours: totalHours % HOURS_PER_DAY,
    minutes: totalMinutes % MINUTES_PER_HOUR,
  };
}

export function currentStage(chain: IEscalationChainSummary): IEscalationStageSummary | null {
  return chain.stages.find(stage => stage.status === ESCALATION_STAGE_STATUS_NOTIFIED) ?? null;
}

export function nextStage(chain: IEscalationChainSummary): IEscalationStageSummary | null {
  const current = currentStage(chain);
  if (!current) {
    return null;
  }

  return (
    chain.stages.find(stage => stage.rank > current.rank && stage.status === ESCALATION_STAGE_STATUS_PENDING) ??
    null
  );
}
