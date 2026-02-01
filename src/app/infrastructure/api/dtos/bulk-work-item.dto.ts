export interface BulkAddWorkItem {
  clientId: string;
  shiftId: string;
  currentDate: string;
  workTime: number;
  startTime: string;
  endTime: string;
  information?: string;
}
