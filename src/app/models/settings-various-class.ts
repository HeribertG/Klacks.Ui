export interface ISetting {
  id: string | undefined;
  type: string;
  value: string;
}

export class Setting implements ISetting {
  id = undefined;
  type = '';
  value = '';
}

export class AppSetting {
  public static APP_NAME = 'APP_NAME';
  public static APP_ADDRESS_NAME = 'APP_ADDRESS_NAME';
  public static APP_ADDRESS_SUPPLEMENT = 'APP_ADDRESS_SUPPLEMENT';
  public static APP_ADDRESS_ADDRESS = 'APP_ADDRESS_ADDRESS';
  public static APP_ADDRESS_ZIP = 'APP_ADDRESS_ZIP';
  public static APP_ADDRESS_PLACE = 'APP_ADDRESS_PLACE';
  public static APP_ADDRESS_PHONE = 'APP_ADDRESS_PHONE';
  public static APP_ADDRESS_MAIL = 'APP_ADDRESS_MAIL';
  public static APP_ACCOUNTING_START = 'APP_ACCOUNTING_START';
  public static readonly APP_ABACUS_CLIENT_NUMBER = 'APP_ABACUS_CLIENT_NUMBER';
  public static readonly APP_ABACUS_BUSINESS_AREA = 'APP_ABACUS_BUSINESS_AREA';

  public static APP_AUTHENTICATION_TYPE = 'authenticationType';
  public static APP_ENABLE_SSL = 'enabledSSL';
  public static APP_DISPOSITION_NOTIFICATION = 'dispositionNotification';
  public static APP_REPLY_TO = 'replyTo';
  public static APP_OUTGOING_SERVER = 'outgoingserver';
  public static APP_OUTGOING_SERVER_TIMEOUT = 'outgoingserverTimeout';
  public static APP_READ_RECEIPT = 'readReceipt';
  public static APP_MARK = 'mark';
  public static APP_OUTGOING_SERVER_PORT = 'outgoingserverPort';
  public static APP_OUTGOING_SERVER_USERNAME = 'outgoingserverUsername';
  public static APP_OUTGOING_SERVER_PASSWORD = 'outgoingserverPassword';
}

export interface IMacroType {
  id: string | undefined;

  name: string | undefined;

  isDefault: boolean | undefined;

  type: number;
}
