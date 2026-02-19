import { IWorkScheduleClient } from '../../schedule/work-schedule-class';
import { IWorkBlock } from './work-block.model';
import { IShiftHistory } from './shift-history.model';
import { IAgentState } from './agent-state.model';

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

export class ScheduleAgent implements IScheduleAgent {
  currentState: IAgentState = {
    physiology: { hunger: 0, satiety: 1 },
    psychology: { greed: 0, disgust: 0 },
    motivation: 0.5
  };

  shiftHistory = new Map<string, IShiftHistory>();
  workBlocks: IWorkBlock[] = [];

  currentHours = 0;
  guaranteedHours = 0;
  periodProgress = 0;
  maxConsecutiveDays = 5;
  minRestDays = 2;
  minRestHours = 12;

  constructor(
    public id: string,
    public client: IWorkScheduleClient
  ) {}

  updateHours(currentHours: number, guaranteedHours: number, periodProgress: number): void {
    this.currentHours = currentHours;
    this.guaranteedHours = guaranteedHours;
    this.periodProgress = Math.max(0, Math.min(1, periodProgress));
  }

  addShiftToHistory(shiftId: string, shiftName: string, date: Date, hours: number): void {
    const existing = this.shiftHistory.get(shiftId);

    if (existing) {
      existing.count++;
      existing.totalHours += hours;
      if (existing.lastDate && date > existing.lastDate) {
        existing.lastDate = date;
      }
      existing.averageSatisfaction = Math.min(1, existing.averageSatisfaction + 0.05);
    } else {
      this.shiftHistory.set(shiftId, {
        shiftId,
        shiftName,
        count: 1,
        lastDate: date,
        totalHours: hours,
        averageSatisfaction: 0.5
      });
    }
  }

  addWorkBlock(block: IWorkBlock): void {
    this.workBlocks.push(block);
  }

  clearWorkBlocks(): void {
    this.workBlocks = [];
  }

  getShiftHistory(shiftId: string): IShiftHistory | undefined {
    return this.shiftHistory.get(shiftId);
  }

  hasWorkedShift(shiftId: string): boolean {
    return this.shiftHistory.has(shiftId);
  }

  getBlockedHours(): number {
    return this.workBlocks.reduce((sum, block) => sum + block.hours, 0);
  }

  getRemainingHours(): number {
    return Math.max(0, this.guaranteedHours - this.currentHours);
  }

  getCompletionRatio(): number {
    if (this.guaranteedHours === 0) return 1;
    return Math.min(1, this.currentHours / this.guaranteedHours);
  }
}
