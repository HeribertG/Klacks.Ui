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
    ScheduleChangeTracked: 'ScheduleChangeTracked',
    CollisionsDetected: 'CollisionsDetected',
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

export const AssistantSignalRConstants = {
  HubPath: '/hubs/assistant-notifications',

  Events: {
    ProactiveMessage: 'ProactiveMessage',
    OnboardingPrompt: 'OnboardingPrompt',
  },

  HubMethods: {
    GetConnectionId: 'GetConnectionId',
  },

  QueryParams: {
    AccessToken: 'access_token',
  },
} as const;
