export interface IAppContactSettings {
  name: string;
  addressName: string;
  supplementAddress: string;
  address: string;
  zip: string;
  place: string;
  phone: string;
  email: string;
  accountingStart: number;
  mark: string;
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
  phone = '';
  email = '';
  accountingStart = 0;
  mark = '';
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

export interface IWorkSettings {
  defaultWorkingHours: number;
  overtimeThreshold: number;
  vacationDaysPerYear: number;
  probationPeriod: number;
  noticePeriod: number;
  paymentInterval: number;
  guaranteedHours: number;
  maximumHours: number;
  minimumHours: number;
  fullTime: number;
  nightRate: number;
  holidayRate: number;
  saRate: number;
  soRate: number;
}

export class WorkSettings implements IWorkSettings {
  defaultWorkingHours = 8.5;
  overtimeThreshold = 42;
  vacationDaysPerYear = 25;
  probationPeriod = 3;
  noticePeriod = 30;
  paymentInterval = 2;
  guaranteedHours = 170;
  maximumHours = 200;
  minimumHours = 160;
  fullTime = 180;
  nightRate = 0.1;
  holidayRate = 0.1;
  saRate = 0.1;
  soRate = 0.1;
}
