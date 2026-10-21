// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IWorkScheduleClient } from '../../schedule/work-schedule-client.interface';
import { IAgentState } from './agent-state.model';
import { IShiftHistory } from './shift-history.model';
import { IWorkBlock } from './work-block.model';

export interface IScheduleAgent {
  id: string;
  client: IWorkScheduleClient;
  currentState: IAgentState;
  currentHours: number;
  guaranteedHours: number;
  periodProgress: number;
  shiftHistory: Map<string, IShiftHistory>;
  workBlocks: IWorkBlock[];
  maxConsecutiveDays: number;
  minRestDays: number;
  minRestHours: number;
  maxDailyHours: number;
  maxWeeklyHours: number;
  maxOptimalGap: number;

  updateHours(currentHours: number, guaranteedHours: number, periodProgress: number): void;
  addShiftToHistory(shiftId: string, shiftName: string, date: Date, hours: number): void;
  addWorkBlock(block: IWorkBlock): void;
  clearWorkBlocks(): void;
  getShiftHistory(shiftId: string): IShiftHistory | undefined;
  hasWorkedShift(shiftId: string): boolean;
  getBlockedHours(): number;
  getRemainingHours(): number;
  getCompletionRatio(): number;
}
