// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
    ThoroughRecalculationCompleted: 'ThoroughRecalculationCompleted',
    ScheduleChangeTracked: 'ScheduleChangeTracked',
    CollisionsDetected: 'CollisionsDetected',
    ScheduleValidationsDetected: 'ScheduleValidationsDetected',
  },

  HubMethods: {
    JoinScheduleGroup: 'JoinScheduleGroup',
    LeaveScheduleGroup: 'LeaveScheduleGroup',
    SetSelectedGroup: 'SetSelectedGroup',
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

export const EmailSignalRConstants = {
  HubPath: '/hubs/email-notifications',

  Events: {
    NewEmailsReceived: 'NewEmailsReceived',
    EmailReadStateChanged: 'EmailReadStateChanged',
  },

  QueryParams: {
    AccessToken: 'access_token',
  },
} as const;

export const WizardSignalRConstants = {
  HubPath: '/hubs/wizard',

  Events: {
    OnProgress: 'OnProgress',
    OnCompleted: 'OnCompleted',
    OnCancelled: 'OnCancelled',
    OnFailed: 'OnFailed',
  },

  HubMethods: {
    JoinJob: 'JoinJob',
    LeaveJob: 'LeaveJob',
  },

  QueryParams: {
    AccessToken: 'access_token',
  },
} as const;

export const HarmonizerSignalRConstants = {
  HubPath: '/hubs/harmonizer',

  Events: {
    OnProgress: 'OnProgress',
    OnCompleted: 'OnCompleted',
    OnCancelled: 'OnCancelled',
    OnFailed: 'OnFailed',
  },

  HubMethods: {
    JoinJob: 'JoinJob',
    LeaveJob: 'LeaveJob',
  },

  QueryParams: {
    AccessToken: 'access_token',
  },
} as const;

export const HolisticHarmonizerSignalRConstants = {
  HubPath: '/hubs/holistic-harmonizer',

  Events: {
    OnProgress: 'OnProgress',
    OnCompleted: 'OnCompleted',
    OnCancelled: 'OnCancelled',
    OnFailed: 'OnFailed',
  },

  HubMethods: {
    JoinJob: 'JoinJob',
    LeaveJob: 'LeaveJob',
  },

  QueryParams: {
    AccessToken: 'access_token',
  },
} as const;

export const AutoWizardSignalRConstants = {
  HubPath: '/hubs/auto-wizard',

  Events: {
    OnCompleted: 'OnCompleted',
    OnFailed: 'OnFailed',
  },

  HubMethods: {
    JoinJob: 'JoinJob',
    LeaveJob: 'LeaveJob',
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
    PluginEvent: 'PluginEvent',
  },

  HubMethods: {
    GetConnectionId: 'GetConnectionId',
  },

  QueryParams: {
    AccessToken: 'access_token',
  },
} as const;
