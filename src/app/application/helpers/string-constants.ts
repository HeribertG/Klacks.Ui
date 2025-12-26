import { DomainMessages } from 'src/app/domain/constants/messages';
import { StorageKeys } from 'src/app/infrastructure/constants/storage-keys';

export class MessageLibrary {
  public static UPDATE_NOT_DONE = DomainMessages.UPDATE_NOT_DONE;
  public static CANCEL_NOT_DONE = DomainMessages.CANCEL_NOT_DONE;
  public static ZIP_NOT_VALID = DomainMessages.ZIP_NOT_VALID;
  public static DISABLE_POPUP_BLOCKER = DomainMessages.DISABLE_POPUP_BLOCKER;
  public static PLEASE_BE_PATIENT_EXCEL = DomainMessages.PLEASE_BE_PATIENT_EXCEL;

  public static readonly TOKEN = StorageKeys.TOKEN;
  public static readonly TOKEN_EXP = StorageKeys.TOKEN_EXP;
  public static readonly TOKEN_SUBJECT = StorageKeys.TOKEN_SUBJECT;
  public static readonly TOKEN_USERNAME = StorageKeys.TOKEN_USERNAME;
  public static readonly TOKEN_USERID = StorageKeys.TOKEN_USERID;
  public static readonly TOKEN_ADMIN = StorageKeys.TOKEN_ADMIN;
  public static readonly TOKEN_AUTHORISED = StorageKeys.TOKEN_AUTHORISED;
  public static readonly TOKEN_REFRESHTOKEN = StorageKeys.TOKEN_REFRESHTOKEN;
  public static readonly TOKEN_APPVERSION = StorageKeys.TOKEN_APPVERSION;

  public static SERVER_NOT_VALID = DomainMessages.SERVER_NOT_VALID;
  public static UNKNOWN_ERROR = DomainMessages.UNKNOWN_ERROR;
  public static HTTP204 = DomainMessages.HTTP204;
  public static HTTP400 = DomainMessages.HTTP400;
  public static HTTP401 = DomainMessages.HTTP401;
  public static HTTP403 = DomainMessages.HTTP403;
  public static HTTP404 = DomainMessages.HTTP404;
  public static EXPIRED_TOKEN = DomainMessages.EXPIRED_TOKEN;

  public static AUTH_USER_NOT_EXIST = DomainMessages.AUTH_USER_NOT_EXIST;
  public static AUTH_USER_ERROR = DomainMessages.AUTH_USER_ERROR;
  public static RESPONSE_ERROR = DomainMessages.RESPONSE_ERROR;

  public static SUCCESS_STORAGE = DomainMessages.SUCCESS_STORAGE;

  public static NEW_ENTRY = DomainMessages.NEW_ENTRY;
  public static NOT_DEFINED = DomainMessages.NOT_DEFINED;
  public static NOT_REGISTER_UPERCASECHARACTER = DomainMessages.NOT_REGISTER_UPERCASECHARACTER;
  public static NOT_REGISTER_DIGIT = DomainMessages.NOT_REGISTER_DIGIT;
  public static NOT_REGISTER_ALPHANUMERICCHARACTER = DomainMessages.NOT_REGISTER_ALPHANUMERICCHARACTER;
  public static NOT_REGISTER = DomainMessages.NOT_REGISTER;
  public static REGISTER = DomainMessages.REGISTER;
  public static REGISTER_CHANGE_PASSWORD = DomainMessages.REGISTER_CHANGE_PASSWORD;
  public static REGISTER_SEND_PASSWORD = DomainMessages.REGISTER_SEND_PASSWORD;
  public static REGISTER_SEND_PASSWORD_ERROR = DomainMessages.REGISTER_SEND_PASSWORD_ERROR;
  public static PASSWORD_RESET_EMAIL_SENT = DomainMessages.PASSWORD_RESET_EMAIL_SENT;
  public static PASSWORD_RESET_EMAIL_ERROR = DomainMessages.PASSWORD_RESET_EMAIL_ERROR;
  public static USER_CREATION_ERROR = DomainMessages.USER_CREATION_ERROR;
  public static INVALID_USER_DATA = DomainMessages.INVALID_USER_DATA;
  public static REGISTER_CHANGE_PASSWORD_HEADER = DomainMessages.REGISTER_CHANGE_PASSWORD_HEADER;

  public static DELETE_ENTRY = DomainMessages.DELETE_ENTRY;
  public static DEACTIVE_ADDRESS = DomainMessages.DEACTIVE_ADDRESS;
  public static REACTIVE_ADDRESS = DomainMessages.REACTIVE_ADDRESS;
  public static DEACTIVE_ADDRESS_TITLE = DomainMessages.DEACTIVE_ADDRESS_TITLE;
  public static REACTIVE_ADDRESS_TITLE = DomainMessages.REACTIVE_ADDRESS_TITLE;

  public static PASSWORD_STRENGTH_SHORT = DomainMessages.PASSWORD_STRENGTH_SHORT;
  public static PASSWORD_STRENGTH_WEAK = DomainMessages.PASSWORD_STRENGTH_WEAK;
  public static PASSWORD_STRENGTH_COMMON = DomainMessages.PASSWORD_STRENGTH_COMMON;
  public static PASSWORD_STRENGTH_STRONG = DomainMessages.PASSWORD_STRENGTH_STRONG;

  public static ADDRES_TYPE0_NAME = DomainMessages.ADDRES_TYPE0_NAME;
  public static ADDRES_TYPE1_NAME = DomainMessages.ADDRES_TYPE1_NAME;
  public static ADDRES_TYPE2_NAME = DomainMessages.ADDRES_TYPE2_NAME;
  public static ADDRES_TYPE_UNDEFINED = DomainMessages.ADDRES_TYPE_UNDEFINED;

  public static ENTITY_TYPE_ALL = DomainMessages.ENTITY_TYPE_ALL;

  public static ERROR_LOADIMAGE_HTTP500 = DomainMessages.ERROR_LOADIMAGE_HTTP500;
  public static ERROR_LOADFILE_HTTP500 = DomainMessages.ERROR_LOADFILE_HTTP500;

  public static SELECTED_ROW_ORDER = DomainMessages.SELECTED_ROW_ORDER;
  public static SELECTED_ROW_ORDER_SHIFT = DomainMessages.SELECTED_ROW_ORDER_SHIFT;

  public static CLIENTLIST_ERROR_500 = DomainMessages.CLIENTLIST_ERROR_500;

  public static ERROR_DATE = DomainMessages.ERROR_DATE;

  public static readonly CURRENT_LANG = StorageKeys.CURRENT_LANG;

  public static readonly DEFAULT_LANG = DomainMessages.DEFAULT_LANG;
  public static NEW_ADDRESS = DomainMessages.NEW_ADDRESS;
  public static VALID_FROM = DomainMessages.VALID_FROM;

  public static ABSENCE = DomainMessages.ABSENCE;
  public static ALL_SCHEDULE = DomainMessages.ALL_SCHEDULE;
  public static ALL_EMPLOYEE = DomainMessages.ALL_EMPLOYEE;
  public static STATISTIC = DomainMessages.STATISTIC;
  public static ALL_GROUP = DomainMessages.ALL_GROUP;
  public static ALL_SHIFT = DomainMessages.ALL_SHIFT;

  public static NOTE_NEW = DomainMessages.NOTE_NEW;
  public static LAST_STATE = DomainMessages.LAST_STATE;
  public static EDITED_FROM = DomainMessages.EDITED_FROM;

  public static COPY = DomainMessages.COPY;
  public static CUT = DomainMessages.CUT;
  public static PASTE = DomainMessages.PASTE;
  public static DELETE = DomainMessages.DELETE;
  public static CONVERT = DomainMessages.CONVERT;
  public static SHOW_IN_SHIFT = DomainMessages.SHOW_IN_SHIFT;

  public static CALENDAR_SELECTION_ID = DomainMessages.CALENDAR_SELECTION_ID;
  public static CALENDAR_SELECTION_TYPE = DomainMessages.CALENDAR_SELECTION_TYPE;

  public static REGISTERUSER_MAILTEXT = DomainMessages.REGISTERUSER_MAILTEXT;
  public static CHANGEPASSWORD_MAILTEXT = DomainMessages.CHANGEPASSWORD_MAILTEXT;
  public static REGISTERUSER_TITLE = DomainMessages.REGISTERUSER_TITLE;
  public static CHANGEPASSWORD_TITLE = DomainMessages.CHANGEPASSWORD_TITLE;
  public static CHANGEPASSWORDUSER_MAILTEXT = DomainMessages.CHANGEPASSWORDUSER_MAILTEXT;

  public static CLIENT_DOUBLETS = DomainMessages.CLIENT_DOUBLETS;
  public static ERROR_TOASTTITLE = DomainMessages.ERROR_TOASTTITLE;

  public static readonly DELETE_ABSENCE_ERROR = DomainMessages.DELETE_ABSENCE_ERROR;
  public static readonly ADD_ABSENCE_ERROR = DomainMessages.ADD_ABSENCE_ERROR;
  public static readonly UPDATE_ABSENCE_ERROR = DomainMessages.UPDATE_ABSENCE_ERROR;
  public static readonly MODIFY_ABSENCE_ERROR = DomainMessages.MODIFY_ABSENCE_ERROR;

  public static readonly DELETE_CLIENT_ERROR = DomainMessages.DELETE_CLIENT_ERROR;
  public static readonly ADD_CLIENT_ERROR = DomainMessages.ADD_CLIENT_ERROR;
  public static readonly UPDATE_CLIENT_ERROR = DomainMessages.UPDATE_CLIENT_ERROR;
  public static readonly MODIFY_CLIENT_ERROR = DomainMessages.MODIFY_CLIENT_ERROR;

  public static readonly DELETE_ASSIGNED_GROUP_ERROR = DomainMessages.DELETE_ASSIGNED_GROUP_ERROR;
  public static readonly ADD_ASSIGNED_GROUP_ERROR = DomainMessages.ADD_ASSIGNED_GROUP_ERROR;
  public static readonly UPDATE_ASSIGNED_GROUP_ERROR = DomainMessages.UPDATE_ASSIGNED_GROUP_ERROR;
  public static readonly MODIFY_ASSIGNED_GROUP_ERROR = DomainMessages.MODIFY_ASSIGNED_GROUP_ERROR;

  public static readonly DELETE_BANK_DETAIL_ERROR = DomainMessages.DELETE_BANK_DETAIL_ERROR;
  public static readonly ADD_BANK_DETAIL_ERROR = DomainMessages.ADD_BANK_DETAIL_ERROR;
  public static readonly UPDATE_BANK_DETAIL_ERROR = DomainMessages.UPDATE_BANK_DETAIL_ERROR;
  public static readonly MODIFY_BANK_DETAIL_ERROR = DomainMessages.MODIFY_BANK_DETAIL_ERROR;

  public static readonly DELETE_BREAK_ERROR = DomainMessages.DELETE_BREAK_ERROR;
  public static readonly ADD_BREAK_ERROR = DomainMessages.ADD_BREAK_ERROR;
  public static readonly UPDATE_BREAK_ERROR = DomainMessages.UPDATE_BREAK_ERROR;
  public static readonly MODIFY_BREAK_ERROR = DomainMessages.MODIFY_BREAK_ERROR;

  public static readonly DELETE_CALENDAR_RULE_ERROR = DomainMessages.DELETE_CALENDAR_RULE_ERROR;
  public static readonly ADD_CALENDAR_RULE_ERROR = DomainMessages.ADD_CALENDAR_RULE_ERROR;
  public static readonly UPDATE_CALENDAR_RULE_ERROR = DomainMessages.UPDATE_CALENDAR_RULE_ERROR;
  public static readonly MODIFY_CALENDAR_RULE_ERROR = DomainMessages.MODIFY_CALENDAR_RULE_ERROR;

  public static readonly DELETE_CALENDAR_SELECTION_ERROR = DomainMessages.DELETE_CALENDAR_SELECTION_ERROR;
  public static readonly ADD_CALENDAR_SELECTION_ERROR = DomainMessages.ADD_CALENDAR_SELECTION_ERROR;
  public static readonly UPDATE_CALENDAR_SELECTION_ERROR = DomainMessages.UPDATE_CALENDAR_SELECTION_ERROR;
  public static readonly MODIFY_CALENDAR_SELECTION_ERROR = DomainMessages.MODIFY_CALENDAR_SELECTION_ERROR;

  public static readonly DELETE_SELECTED_CALENDAR_ERROR = DomainMessages.DELETE_SELECTED_CALENDAR_ERROR;
  public static readonly ADD_SELECTED_CALENDAR_ERROR = DomainMessages.ADD_SELECTED_CALENDAR_ERROR;
  public static readonly UPDATE_SELECTED_CALENDAR_ERROR = DomainMessages.UPDATE_SELECTED_CALENDAR_ERROR;
  public static readonly MODIFY_SELECTED_CALENDAR_ERROR = DomainMessages.MODIFY_SELECTED_CALENDAR_ERROR;

  public static readonly DELETE_COUNTRY_ERROR = DomainMessages.DELETE_COUNTRY_ERROR;
  public static readonly ADD_COUNTRY_ERROR = DomainMessages.ADD_COUNTRY_ERROR;
  public static readonly UPDATE_COUNTRY_ERROR = DomainMessages.UPDATE_COUNTRY_ERROR;
  public static readonly MODIFY_COUNTRY_ERROR = DomainMessages.MODIFY_COUNTRY_ERROR;

  public static readonly DELETE_STATE_ERROR = DomainMessages.DELETE_STATE_ERROR;
  public static readonly ADD_STATE_ERROR = DomainMessages.ADD_STATE_ERROR;
  public static readonly UPDATE_STATE_ERROR = DomainMessages.UPDATE_STATE_ERROR;
  public static readonly MODIFY_STATE_ERROR = DomainMessages.MODIFY_STATE_ERROR;

  public static readonly DELETE_GROUP_ERROR = DomainMessages.DELETE_GROUP_ERROR;
  public static readonly ADD_GROUP_ERROR = DomainMessages.ADD_GROUP_ERROR;
  public static readonly UPDATE_GROUP_ERROR = DomainMessages.UPDATE_GROUP_ERROR;
  public static readonly MODIFY_GROUP_ERROR = DomainMessages.MODIFY_GROUP_ERROR;

  public static readonly DELETE_FILE_ERROR = DomainMessages.DELETE_FILE_ERROR;
  public static readonly ADD_FILE_ERROR = DomainMessages.ADD_FILE_ERROR;
  public static readonly UPDATE_FILE_ERROR = DomainMessages.UPDATE_FILE_ERROR;
  public static readonly MODIFY_FILE_ERROR = DomainMessages.MODIFY_FILE_ERROR;

  public static readonly DELETE_MACRO_ERROR = DomainMessages.DELETE_MACRO_ERROR;
  public static readonly ADD_MACRO_ERROR = DomainMessages.ADD_MACRO_ERROR;
  public static readonly UPDATE_MACRO_ERROR = DomainMessages.UPDATE_MACRO_ERROR;
  public static readonly MODIFY_MACRO_ERROR = DomainMessages.MODIFY_MACRO_ERROR;

  public static readonly DELETE_WORK_ERROR = DomainMessages.DELETE_WORK_ERROR;
  public static readonly ADD_WORK_ERROR = DomainMessages.ADD_WORK_ERROR;
  public static readonly UPDATE_WORK_ERROR = DomainMessages.UPDATE_WORK_ERROR;
  public static readonly MODIFY_WORK_ERROR = DomainMessages.MODIFY_WORK_ERROR;

  public static readonly DELETE_SHIFT_ERROR = DomainMessages.DELETE_SHIFT_ERROR;
  public static readonly ADD_SHIFT_ERROR = DomainMessages.ADD_SHIFT_ERROR;
  public static readonly UPDATE_SHIFT_ERROR = DomainMessages.UPDATE_SHIFT_ERROR;
  public static readonly MODIFY_SHIFT_ERROR = DomainMessages.MODIFY_SHIFT_ERROR;

  public static readonly DELETE_ADDRESS_ERROR = DomainMessages.DELETE_ADDRESS_ERROR;
  public static readonly ADD_ADDRESS_ERROR = DomainMessages.ADD_ADDRESS_ERROR;
  public static readonly UPDATE_ADDRESS_ERROR = DomainMessages.UPDATE_ADDRESS_ERROR;
  public static readonly MODIFY_ADDRESS_ERROR = DomainMessages.MODIFY_ADDRESS_ERROR;

  public static readonly DELETE_COMMUNICATION_ERROR = DomainMessages.DELETE_COMMUNICATION_ERROR;
  public static readonly ADD_COMMUNICATION_ERROR = DomainMessages.ADD_COMMUNICATION_ERROR;
  public static readonly UPDATE_COMMUNICATION_ERROR = DomainMessages.UPDATE_COMMUNICATION_ERROR;
  public static readonly MODIFY_COMMUNICATION_ERROR = DomainMessages.MODIFY_COMMUNICATION_ERROR;

  public static readonly DELETE_SETTING_ERROR = DomainMessages.DELETE_SETTING_ERROR;
  public static readonly ADD_SETTING_ERROR = DomainMessages.ADD_SETTING_ERROR;
  public static readonly UPDATE_SETTING_ERROR = DomainMessages.UPDATE_SETTING_ERROR;
  public static readonly MODIFY_SETTING_ERROR = DomainMessages.MODIFY_SETTING_ERROR;

  public static readonly DELETE_ENTRY_ERROR = DomainMessages.DELETE_ENTRY_ERROR;
  public static readonly ADD_ENTRY_ERROR = DomainMessages.ADD_ENTRY_ERROR;
  public static readonly UPDATE_ENTRY_ERROR = DomainMessages.UPDATE_ENTRY_ERROR;
  public static readonly MODIFY_ENTRY_ERROR = DomainMessages.MODIFY_ENTRY_ERROR;

  public static SHIFT_SPORADIC_WEEK = DomainMessages.SHIFT_SPORADIC_WEEK;
  public static SHIFT_SPORADIC_MONTH = DomainMessages.SHIFT_SPORADIC_MONTH;
  public static SHIFT_SPORADIC_YEAR = DomainMessages.SHIFT_SPORADIC_YEAR;
  public static SHIFT_SPORADIC_QUARTER = DomainMessages.SHIFT_SPORADIC_QUARTER;
  public static SHIFT_SPORADIC_SEMESTER = DomainMessages.SHIFT_SPORADIC_SEMESTER;
  public static SHIFT_SPORADIC_CONTRACTUALTERM = DomainMessages.SHIFT_SPORADIC_CONTRACTUALTERM;
}
