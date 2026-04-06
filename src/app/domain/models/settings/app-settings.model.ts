// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IAppContactSettings {
  name: string;
  addressName: string;
  supplementAddress: string;
  address: string;
  zip: string;
  place: string;
  state: string;
  country: string;
  phone: string;
  email: string;
  telegram: string;
  accountingStart: number;
  mark: string;
  globalCalendarCountry: string;
  globalCalendarState: string;
  globalCalendarSelectionId: string;
}

export interface IEmailServerSettings {
  outgoingServer: string;
  outgoingServerPort: string;
  enabledSSL: string;
  outgoingServerTimeout: string;
  authenticationType: string;
  readReceipt: string;
  replyTo: string;
  dispositionNotification: string;
  username: string;
  password: string;
}

export class AppContactSettings implements IAppContactSettings {
  name = '';
  addressName = '';
  supplementAddress = '';
  address = '';
  zip = '';
  place = '';
  state = '';
  country = '';
  phone = '';
  email = '';
  telegram = '';
  accountingStart = 0;
  mark = '';
  globalCalendarCountry = '';
  globalCalendarState = '';
  globalCalendarSelectionId = '';
}

export class EmailServerSettings implements IEmailServerSettings {
  outgoingServer = '';
  outgoingServerPort = '';
  enabledSSL = '';
  outgoingServerTimeout = '';
  authenticationType = '';
  readReceipt = '';
  replyTo = '';
  dispositionNotification = '';
  username = '';
  password = '';
}

export interface IImapServerSettings {
  server: string;
  port: string;
  username: string;
  password: string;
  enableSSL: string;
  folder: string;
  pollInterval: string;
}

export class ImapServerSettings implements IImapServerSettings {
  server = '';
  port = '993';
  username = '';
  password = '';
  enableSSL = 'true';
  folder = 'INBOX';
  pollInterval = '300';
}

export interface ISchedulingDefaultSettings {
  defaultWorkingHours: number;
  overtimeThreshold: number;
  guaranteedHours: number;
  maximumHours: number;
  minimumHours: number;
  fullTime: number;
  schedulingMaxWorkDays: number;
  schedulingMinRestDays: number;
  schedulingMinPauseHours: number;
  schedulingMaxOptimalGap: number;
  schedulingMaxDailyHours: number;
  schedulingMaxWeeklyHours: number;
  schedulingMaxConsecutiveDays: number;
  workOnMonday: boolean;
  workOnTuesday: boolean;
  workOnWednesday: boolean;
  workOnThursday: boolean;
  workOnFriday: boolean;
  workOnSaturday: boolean;
  workOnSunday: boolean;
  performsShiftWork: boolean;
}

export class SchedulingDefaultSettings implements ISchedulingDefaultSettings {
  defaultWorkingHours = 8.5;
  overtimeThreshold = 42;
  guaranteedHours = 170;
  maximumHours = 200;
  minimumHours = 160;
  fullTime = 180;
  schedulingMaxWorkDays = 5;
  schedulingMinRestDays = 2;
  schedulingMinPauseHours = 12;
  schedulingMaxOptimalGap = 2;
  schedulingMaxDailyHours = 10;
  schedulingMaxWeeklyHours = 50;
  schedulingMaxConsecutiveDays = 6;
  workOnMonday = true;
  workOnTuesday = true;
  workOnWednesday = true;
  workOnThursday = true;
  workOnFriday = true;
  workOnSaturday = false;
  workOnSunday = false;
  performsShiftWork = false;
}

export interface IDataRetentionSettings {
  dataRetentionDays: number;
}

export class DataRetentionSettings implements IDataRetentionSettings {
  dataRetentionDays = 3650;
}

export interface IWorkSettings {
  vacationDaysPerYear: number;
  probationPeriod: number;
  noticePeriod: number;
  paymentInterval: number;
  nightRate: number;
  holidayRate: number;
  saRate: number;
  soRate: number;
  dayVisibleBefore: number;
  dayVisibleAfter: number;
}

export class WorkSettings implements IWorkSettings {
  vacationDaysPerYear = 25;
  probationPeriod = 3;
  noticePeriod = 30;
  paymentInterval = 2;
  nightRate = 0.1;
  holidayRate = 0.1;
  saRate = 0.1;
  soRate = 0.1;
  dayVisibleBefore = 3;
  dayVisibleAfter = 3;
}
