export interface IPeriodClosure {
  id: string;
  startDate: string;
  endDate: string;
  closedBy: string;
  closedAt: string;
}

export class PeriodClosure implements IPeriodClosure {
  id = '';
  startDate = '';
  endDate = '';
  closedBy = '';
  closedAt = '';
}
