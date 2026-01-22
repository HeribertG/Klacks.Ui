export interface IPeriodHoursNotification {
  clientId: string;
  startDate: string;
  endDate: string;
  hours: number;
  surcharges: number;
  guaranteedHours: number;
  sourceConnectionId: string;
}

export interface IPeriodHoursRecalculatedNotification {
  startDate: string;
  endDate: string;
}
