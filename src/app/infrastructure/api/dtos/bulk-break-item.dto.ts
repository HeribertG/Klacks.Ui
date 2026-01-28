export interface BulkAddBreakItem {
  clientId: string;
  absenceId: string;
  currentDate: string;
  workTime: number;
  startTime: string;
  endTime: string;
  information?: string;
}
