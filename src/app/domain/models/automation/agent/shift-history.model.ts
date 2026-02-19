export interface IShiftHistory {
  shiftId: string;
  shiftName: string;
  count: number;
  lastDate: Date | null;
  totalHours: number;
  averageSatisfaction: number;
}
