export const SignalRConstants = {
  HubPath: '/hubs/work-notifications',

  Events: {
    WorkCreated: 'WorkCreated',
    WorkUpdated: 'WorkUpdated',
    WorkDeleted: 'WorkDeleted',
    ScheduleUpdated: 'ScheduleUpdated',
    ShiftStatsUpdated: 'ShiftStatsUpdated',
    PeriodHoursUpdated: 'PeriodHoursUpdated',
    PeriodHoursRecalculated: 'PeriodHoursRecalculated',
  },

  HubMethods: {
    JoinScheduleGroup: 'JoinScheduleGroup',
    LeaveScheduleGroup: 'LeaveScheduleGroup',
    JoinClientGroup: 'JoinClientGroup',
    LeaveClientGroup: 'LeaveClientGroup',
    JoinClientGroups: 'JoinClientGroups',
    LeaveClientGroups: 'LeaveClientGroups',
    GetConnectionId: 'GetConnectionId',
  },

  Groups: {
    schedule: (startDate: string, endDate: string): string =>
      `schedule_${startDate}_${endDate}`,
    client: (clientId: string): string =>
      `client_${clientId}`,
  },

  QueryParams: {
    AccessToken: 'access_token',
  },
} as const;
