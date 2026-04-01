// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
  public static APP_ADDRESS_STATE = 'APP_ADDRESS_STATE';
  public static APP_ADDRESS_COUNTRY = 'APP_ADDRESS_COUNTRY';
  public static APP_ADDRESS_PHONE = 'APP_ADDRESS_PHONE';
  public static APP_ADDRESS_MAIL = 'APP_ADDRESS_MAIL';
  public static APP_ACCOUNTING_START = 'APP_ACCOUNTING_START';

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

  public static APP_INCOMING_SERVER = 'incomingserver';
  public static APP_INCOMING_SERVER_PORT = 'incomingserverPort';
  public static APP_INCOMING_SERVER_USERNAME = 'incomingserverUsername';
  public static APP_INCOMING_SERVER_PASSWORD = 'incomingserverPassword';
  public static APP_INCOMING_SERVER_SSL = 'incomingserverSSL';
  public static APP_INCOMING_SERVER_FOLDER = 'incomingserverFolder';
  public static APP_INCOMING_SERVER_POLL_INTERVAL = 'incomingserverPollInterval';

  public static OPENROUTESERVICE_API_KEY = 'OPENROUTESERVICE_API_KEY';
  public static DEEPL_API_KEY = 'DEEPL_API_KEY';

  public static WORK_DEFAULT_WORKING_HOURS = 'defaultWorkingHours';
  public static WORK_OVERTIME_THRESHOLD = 'overtimeThreshold';
  public static WORK_VACATION_DAYS_PER_YEAR = 'vacationDaysPerYear';
  public static WORK_PROBATION_PERIOD = 'probationPeriod';
  public static WORK_NOTICE_PERIOD = 'noticePeriod';
  public static WORK_PAYMENT_INTERVAL = 'paymentInterval';
  public static WORK_GUARANTEED_HOURS = 'guaranteedHours';
  public static WORK_MAXIMUM_HOURS = 'maximumHours';
  public static WORK_MINIMUM_HOURS = 'minimumHours';
  public static WORK_FULL_TIME = 'fullTime';
  public static WORK_NIGHT_RATE = 'nightRate';
  public static WORK_HOLIDAY_RATE = 'holidayRate';
  public static WORK_SA_RATE = 'saRate';
  public static WORK_SO_RATE = 'soRate';
  public static WORK_DAY_VISIBLE_BEFORE = 'dayVisibleBefore';
  public static WORK_DAY_VISIBLE_AFTER = 'dayVisibleAfter';

  public static SCHEDULING_MAX_WORK_DAYS = 'SCHEDULING_MAX_WORK_DAYS';
  public static SCHEDULING_MIN_REST_DAYS = 'SCHEDULING_MIN_REST_DAYS';
  public static SCHEDULING_MIN_PAUSE_HOURS = 'SCHEDULING_MIN_PAUSE_HOURS';
  public static SCHEDULING_MAX_OPTIMAL_GAP = 'SCHEDULING_MAX_OPTIMAL_GAP';
  public static SCHEDULING_MAX_DAILY_HOURS = 'SCHEDULING_MAX_DAILY_HOURS';
  public static SCHEDULING_MAX_WEEKLY_HOURS = 'SCHEDULING_MAX_WEEKLY_HOURS';
  public static SCHEDULING_MAX_CONSECUTIVE_DAYS = 'SCHEDULING_MAX_CONSECUTIVE_DAYS';

  public static DATA_RETENTION_DAYS = 'DATA_RETENTION_DAYS';

  public static REPORT_DEFAULT_TEMPLATES = 'REPORT_DEFAULT_TEMPLATES';

  public static GLOBAL_CALENDAR_COUNTRY = 'globalCalendarCountry';
  public static GLOBAL_CALENDAR_STATE = 'globalCalendarState';
  public static GLOBAL_CALENDAR_SELECTION_ID = 'globalCalendarSelectionId';
}

export interface IMacroType {
  id: string | undefined;

  name: string | undefined;

  isDefault: boolean | undefined;

  type: number;
}
