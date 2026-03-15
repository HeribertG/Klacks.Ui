// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Einzelner Validierungseintrag vom Backend (Kollision, Ruhezeit, Arbeitszeit).
 * @param type - 'error', 'warning' oder 'info'
 * @param comment - Übersetzungsschlüssel
 * @param commentParams - Parameter für die Übersetzung
 */
export interface IScheduleValidationNotification {
  type: 'error' | 'warning' | 'info';
  clientId: string;
  clientName: string;
  date: string;
  comment: string;
  commentParams: Record<string, string>;
}

export interface IScheduleValidationListNotification {
  entries: IScheduleValidationNotification[];
  isFullRefresh: boolean;
  checkedClientId?: string;
  checkedDate?: string;
}
