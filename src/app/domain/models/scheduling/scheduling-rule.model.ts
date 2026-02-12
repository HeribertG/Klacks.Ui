export interface ISchedulingRule {
  id: string;
  name: string;
  maxWorkDays: number | null;
  minRestDays: number | null;
  minPauseHours: number | null;
  maxOptimalGap: number | null;
  maxDailyHours: number | null;
  maxWeeklyHours: number | null;
  maxConsecutiveDays: number | null;
}

export class SchedulingRule implements ISchedulingRule {
  id = '';
  name = '';
  maxWorkDays: number | null = null;
  minRestDays: number | null = null;
  minPauseHours: number | null = null;
  maxOptimalGap: number | null = null;
  maxDailyHours: number | null = null;
  maxWeeklyHours: number | null = null;
  maxConsecutiveDays: number | null = null;
}
