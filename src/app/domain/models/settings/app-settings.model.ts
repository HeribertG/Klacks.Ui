// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { IndustrySlugs } from 'src/app/domain/constants/industry-slugs.constants';

export interface IAppContactSettings {
  name: string;
  addressName: string;
  supplementAddress: string;
  address: string;
  zip: string;
  place: string;
  state: string;
  country: string;
  timeZone: string;
  phone: string;
  email: string;
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
  timeZone = '';
  phone = '';
  email = '';
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
  weekendDays: string[];
  weekStartDay: string;
  commandKeywordFree: string;
  commandKeywordEarly: string;
  commandKeywordLate: string;
  commandKeywordNight: string;
  commandKeywordNegFree: string;
  commandKeywordNegEarly: string;
  commandKeywordNegLate: string;
  commandKeywordNegNight: string;
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
  weekendDays = ['Saturday', 'Sunday'];
  weekStartDay = 'Monday';
  commandKeywordFree = 'FREE';
  commandKeywordEarly = 'EARLY';
  commandKeywordLate = 'LATE';
  commandKeywordNight = 'NIGHT';
  commandKeywordNegFree = '-FREE';
  commandKeywordNegEarly = '-EARLY';
  commandKeywordNegLate = '-LATE';
  commandKeywordNegNight = '-NIGHT';
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

export interface IOnCallSettings {
  onCallEnabled: boolean;
  onCallPresenceCountsPercent: number;
  onCallStandbyCountsPercent: number;
  onCallIncludeInPeriodCaps: boolean;
}

export class OnCallSettings implements IOnCallSettings {
  onCallEnabled = false;
  onCallPresenceCountsPercent = 100;
  onCallStandbyCountsPercent = 0;
  onCallIncludeInPeriodCaps = false;
}

export interface ICompensatoryRestSettings {
  compensatoryRestEnabled: boolean;
  compensatoryRestDeadlineDays: number;
  compensatoryRestAutoPlan: boolean;
}

export class CompensatoryRestSettings implements ICompensatoryRestSettings {
  compensatoryRestEnabled = false;
  compensatoryRestDeadlineDays = 0;
  compensatoryRestAutoPlan = false;
}

export type SurchargeRateMode = 'multiplier' | 'fixedperhour' | 'fixedpershift';
export type SurchargeStackingMode = 'highestwins' | 'additive';

export interface ISurchargeModeSettings {
  we3Rate: number;
  nightRateMode: SurchargeRateMode;
  holidayRateMode: SurchargeRateMode;
  we1RateMode: SurchargeRateMode;
  we2RateMode: SurchargeRateMode;
  we3RateMode: SurchargeRateMode;
  nightMinimumPerHour: number | null;
  holidayMinimumPerHour: number | null;
  we1MinimumPerHour: number | null;
  we2MinimumPerHour: number | null;
  we3MinimumPerHour: number | null;
  nightStart: string;
  nightEnd: string;
  stackingMode: SurchargeStackingMode;
}

export class SurchargeModeSettings implements ISurchargeModeSettings {
  we3Rate = 0;
  nightRateMode: SurchargeRateMode = 'multiplier';
  holidayRateMode: SurchargeRateMode = 'multiplier';
  we1RateMode: SurchargeRateMode = 'multiplier';
  we2RateMode: SurchargeRateMode = 'multiplier';
  we3RateMode: SurchargeRateMode = 'multiplier';
  nightMinimumPerHour: number | null = null;
  holidayMinimumPerHour: number | null = null;
  we1MinimumPerHour: number | null = null;
  we2MinimumPerHour: number | null = null;
  we3MinimumPerHour: number | null = null;
  nightStart = '23:00';
  nightEnd = '06:00';
  stackingMode: SurchargeStackingMode = 'highestwins';
}

export type OvertimeBasis = 'day' | 'week';
export type OvertimeRateMode = 'multiplier' | 'fixedperhour';

export interface IOvertimeSettings {
  overtimeBasis: OvertimeBasis;
  overtimeRateMode: OvertimeRateMode;
  overtimeTier1AfterHours: number | null;
  overtimeTier1Rate: number | null;
  overtimeTier2AfterHours: number | null;
  overtimeTier2Rate: number | null;
  overtimeTier3AfterHours: number | null;
  overtimeTier3Rate: number | null;
}

export class OvertimeSettings implements IOvertimeSettings {
  overtimeBasis: OvertimeBasis = 'day';
  overtimeRateMode: OvertimeRateMode = 'multiplier';
  overtimeTier1AfterHours: number | null = null;
  overtimeTier1Rate: number | null = null;
  overtimeTier2AfterHours: number | null = null;
  overtimeTier2Rate: number | null = null;
  overtimeTier3AfterHours: number | null = null;
  overtimeTier3Rate: number | null = null;
}

export type ComplianceEnforcementDefaultMode = 'warn' | 'block';
export type ComplianceEnforcementRuleMode = '' | 'warn' | 'block';

export interface IComplianceEnforcementSettings {
  enforcementDefaultMode: ComplianceEnforcementDefaultMode;
  enforcementAllowSupervisorOverride: boolean;
  enforcementMaxDailyHours: ComplianceEnforcementRuleMode;
  enforcementMaxWeeklyHours: ComplianceEnforcementRuleMode;
  enforcementMinRestHours: ComplianceEnforcementRuleMode;
  enforcementMinRestDays: ComplianceEnforcementRuleMode;
  enforcementMaxConsecutiveDays: ComplianceEnforcementRuleMode;
  enforcementPeriodCap: ComplianceEnforcementRuleMode;
  enforcementRollingAverage: ComplianceEnforcementRuleMode;
  enforcementRestDayRotation: ComplianceEnforcementRuleMode;
  enforcementCounterRule: ComplianceEnforcementRuleMode;
  enforcementCompensatoryRest: ComplianceEnforcementRuleMode;
  enforcementRestrictedTimeWindow: ComplianceEnforcementRuleMode;
  rosterPublicationMinLeadDays: number;
  rosterPublicationCountWorkdaysOnly: boolean;
}

export class ComplianceEnforcementSettings implements IComplianceEnforcementSettings {
  enforcementDefaultMode: ComplianceEnforcementDefaultMode = 'warn';
  enforcementAllowSupervisorOverride = true;
  enforcementMaxDailyHours: ComplianceEnforcementRuleMode = '';
  enforcementMaxWeeklyHours: ComplianceEnforcementRuleMode = '';
  enforcementMinRestHours: ComplianceEnforcementRuleMode = '';
  enforcementMinRestDays: ComplianceEnforcementRuleMode = '';
  enforcementMaxConsecutiveDays: ComplianceEnforcementRuleMode = '';
  enforcementPeriodCap: ComplianceEnforcementRuleMode = '';
  enforcementRollingAverage: ComplianceEnforcementRuleMode = '';
  enforcementRestDayRotation: ComplianceEnforcementRuleMode = '';
  enforcementCounterRule: ComplianceEnforcementRuleMode = '';
  enforcementCompensatoryRest: ComplianceEnforcementRuleMode = '';
  enforcementRestrictedTimeWindow: ComplianceEnforcementRuleMode = '';
  rosterPublicationMinLeadDays = 0;
  rosterPublicationCountWorkdaysOnly = false;
}

export interface IActiveIndustriesSettings {
  activeIndustries: string[];
}

export class ActiveIndustriesSettings implements IActiveIndustriesSettings {
  activeIndustries: string[] = [...IndustrySlugs.All];
}
