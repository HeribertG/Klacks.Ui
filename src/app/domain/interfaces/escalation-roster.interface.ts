// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IEscalationRosterMember {
  userId: string;
  displayName: string;
  hasPhoneNumber: boolean;
  isCurrentlyAbsent: boolean;
}

export interface IUserAbsencePeriod {
  id: string;
  appUserId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
}
