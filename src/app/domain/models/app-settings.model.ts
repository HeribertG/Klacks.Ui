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
