export class MessageLibrary {
  constructor() {}
  public static UPDATE_NOT_DONE =
    'Änderungen wurden von der Datenbank nicht übernommen';
  public static CANCEL_NOT_DONE =
    'Änderungen können nicht rückgängig gemacht werden';
  public static ZIP_NOT_VALID =
    'Bitte überprüfen sie die Postleitzahl auf ihre Gültigkeit';
  public static DISABLE_POPUP_BLOCKER =
    'Bitte deaktivieren Sie Ihren Pop-Up-Blocker und versuchen Sie es noch einmal.';
  public static PLEASE_BE_PATIENT_EXCEL = `Die Excel Datei braucht ein wenig Zeit für seine Erstellung.
  Bitte haben sie einen Moment Geduld.`;

  public static readonly TOKEN = 'JWT_TOKEN';
  public static readonly TOKEN_EXP = 'JWT_TOKEN_EXP';
  public static readonly TOKEN_SUBJECT = 'JWT_TOKEN_SUBJECT';
  public static readonly TOKEN_USERNAME = 'JWT_TOKEN_USERNAME';
  public static readonly TOKEN_USERID = 'JWT_TOKEN_USERID';
  public static readonly TOKEN_ADMIN = 'JWT_TOKEN_ADMIN';
  public static readonly TOKEN_AUTHORISED = 'JWT_AUTHORISED';
  public static readonly TOKEN_REFRESHTOKEN = 'JWT_REFRESH';
  public static readonly TOKEN_APPVERSION = 'JWT_APP_VERSION';

  public static SERVER_NOT_VALID =
    'Es konnte keine Verbindung mit dem Server hergestellt werden';
  public static UNKNOWN_ERROR = 'Unbekannter Fehler';
  public static HTTP204 =
    'Fehler 204 Die Ressource konnte nicht gefunden werden';
  public static HTTP400 = 'Fehler 400 Ungültige Anforderung';
  public static HTTP401 =
    'Fehler 401 Nicht autorisierter Zugriff. Möglicherweise ist ihre Zugangsberechtigung abgelaufen!';
  public static HTTP403 =
    'Fehler 403 Die Anfrage wird mangels Berechtigung nicht durchgeführt';
  public static HTTP404 =
    'Fehler 404 Die angeforderte Ressource wurde nicht gefunden';
  public static EXPIRED_TOKEN = 'Ihre Zugangsberechtigung ist abgelaufen!';

  public static AUTH_USER_NOT_EXIST =
    'Es wurde ein falsches Passwort oder falscher Benutzername eingegeben. Bitte versuchen Sie es erneut!';
  public static AUTH_USER_ERROR = 'Zugangsberechtigung fehlgeschlagen! ';
  public static RESPONSE_ERROR = 'Bekommen keine Antwort vom Server! ';

  public static SUCCESS_STORAGE = 'Daten wurden erfolgreich gespeichert';

  public static NEW_ENTRY = 'neuer Eintrag';
  public static NOT_DEFINED = 'nicht definiert';
  public static NOT_REGISTER_UPERCASECHARACTER =
    'Passwörter müssen mindestens ein Zeichen in Großbuchstaben enthalten.';
  public static NOT_REGISTER_DIGIT =
    'Passwörter müssen mindestens eine Zahl haben.';
  public static NOT_REGISTER_ALPHANUMERICCHARACTER =
    'Passwörter müssen mindestens ein nicht alphabetisches Zeichen enthalten.';
  public static NOT_REGISTER = 'Konnte Account nicht speichern';
  public static REGISTER =
    'Die Account Daten wurden in der Zwischenablage gespeichert';
  public static REGISTER_CHANGE_PASSWORD =
    'Die Account Daten wurden in der Zwischenablage gespeichert';
  public static REGISTER_SEND_PASSWORD =
    'Das Passwort wurde erfolgreich zurückgesetzt und an die Mailadresse versendet';
  public static REGISTER_SEND_PASSWORD_ERROR = 'Error';
  public static REGISTER_CHANGE_PASSWORD_HEADER =
    'Die Account Daten wurden in der Zwischenablage gespeichert';

  public static DELETE_ENTRY = 'Wollen Sie diesen Datensatz wirklich löschen?';
  public static DEACTIVE_ADDRESS = 'Wollen Sie diese Adresse deaktivieren?';
  public static REACTIVE_ADDRESS = 'Wollen Sie diese Adresse reaktivieren?';
  public static readonly DEACTIVE_ADDRESS_TITLE = 'Deaktivieren';
  public static REACTIVE_ADDRESS_TITLE = 'Reaktivieren';

  public static PASSWORD_STRENGTH_SHORT = 'zu kurz';
  public static PASSWORD_STRENGTH_WEAK = 'zu schwach';
  public static PASSWORD_STRENGTH_COMMON = 'zu unsicher';
  public static PASSWORD_STRENGTH_STRONG = 'sicher';

  public static ADDRES_TYPE0_NAME = 'Hauptadresse';
  public static ADDRES_TYPE1_NAME = 'Geschäftsadresse';
  public static ADDRES_TYPE2_NAME = 'Rechnungsadresse';
  public static ADDRES_TYPE_UNDEFINED = 'Undefiniert';

  public static ENTITY_TYPE_ALL = 'Alle Kategorien';

  public static ERROR_LOADIMAGE_HTTP500 =
    'Bild konnte auf dem Server nicht gefunden werden';
  public static ERROR_LOADFILE_HTTP500 =
    'Datei konnte auf dem Server nicht gefunden werden';

  public static SELECTED_ROW_ORDER = 'SELECTED_ROW_ORDER';

  public static CLIENTLIST_ERROR_500 =
    'Internal Server Error. Beim Lesen der Mitgliederliste ist ein Fehler aufgetaucht. Bitte versuchen sie es erneut ';

  public static ERROR_DATE = 'Datum kann nicht interpretiert werden';

  public static readonly CURRENT_LANG = 'CURRENT_LANG';

  public static readonly DEFAULT_LANG = 'de';
  public static NEW_ADDRESS = 'Neue Adresse erstellen';
  public static VALID_FROM = 'Gültig ab:';

  public static ABSENCE = 'Absenzen Kalender';
  public static ALL_SCHEDULE = 'Alle Planungen';
  public static ALL_EMPLOYEE = 'Alle Mitarbeiter';
  public static STATISTIC = 'Statistiken';
  public static ALL_GROUP = 'Alle Gruppen';
  public static ALL_SHIFT = 'Alle Dienste';

  public static NOTE_NEW = 'neue Notiz hinzufügen';
  public static LAST_STATE = 'letzter Stand:';
  public static EDITED_FROM = ', bearbeitet von ';

  public static COPY = 'Kopieren';
  public static CUT = 'Ausschneiden';
  public static PASTE = 'Einfügen';
  public static DELETE = 'Löschen';
  public static CONVERT = 'Umwandeln...';

  public static CALENDAR_SELECTION_ID = 'Calendar';
  public static CALENDAR_SELECTION_TYPE = 'Gantt';

  public static REGISTERUSER_MAILTEXT =
    '<h2><strong>Ihr Passwort f&uuml;r unsere Applikation&nbsp;{appName}.</strong></h2><p>{password}</p><p>Bitte benutzen sie dieses automatisch generierte Passwort nur einmal.</p><p>Sie k&ouml;nnen jederzeit ihr Passwort unter Profile um&auml;ndern.</p><p>&nbsp;</p><p>Freundliche Gr&uuml;sse</p><p>Ihre Administration</p>';
  public static CHANGEPASSWORD_MAILTEXT =
    '<h2><strong>Ihr Passwort wurde ge&auml;ndert.</strong></h2><p> {model.Password}</p><p> Bitte benutzen sie dieses automatisch generierte Passwort nur einmal.</p><p> Sie k&ouml;nnen jederzeit ihr Passwort unter Profile um&auml;ndern.</p><p> &nbsp;</p><p> Freundliche Gr&uuml;sse </p><p> Ihre Administration</p>';
  public static 'REGISTERUSER_TITLE' = 'Neuregistrierung';
  public static CHANGEPASSWORD_TITLE = 'Passwortänderung';
  public static CHANGEPASSWORDUSER_MAILTEXT =
    '<h2><strong>Ihr Passwort wurde ge&auml;ndert.</strong></h2>p>Sie k&ouml;nnen jederzeit ihr Passwort unter Profile um&auml;ndern.</p><p> &nbsp;</p><p> Freundliche Gr&uuml;sse </p><p> Ihre Administration</p>"';

  public static CLIENT_DOUBLETS =
    'Die ausgewählte Person ist in der Liste schon vorhanden';
  public static ERROR_TOASTTITLE = 'Fehler';

  // =================== API ERROR CONSTANTS ===================
  // Absence Errors
  public static readonly DELETE_ABSENCE_ERROR = 'DELETE_ABSENCE_ERROR';
  public static readonly ADD_ABSENCE_ERROR = 'ADD_ABSENCE_ERROR';
  public static readonly UPDATE_ABSENCE_ERROR = 'UPDATE_ABSENCE_ERROR';
  public static readonly MODIFY_ABSENCE_ERROR = 'MODIFY_ABSENCE_ERROR';

  // Client Errors
  public static readonly DELETE_CLIENT_ERROR = 'DELETE_CLIENT_ERROR';
  public static readonly ADD_CLIENT_ERROR = 'ADD_CLIENT_ERROR';
  public static readonly UPDATE_CLIENT_ERROR = 'UPDATE_CLIENT_ERROR';
  public static readonly MODIFY_CLIENT_ERROR = 'MODIFY_CLIENT_ERROR';

  // Assigned Group Errors
  public static readonly DELETE_ASSIGNED_GROUP_ERROR =
    'DELETE_ASSIGNED_GROUP_ERROR';
  public static readonly ADD_ASSIGNED_GROUP_ERROR = 'ADD_ASSIGNED_GROUP_ERROR';
  public static readonly UPDATE_ASSIGNED_GROUP_ERROR =
    'UPDATE_ASSIGNED_GROUP_ERROR';
  public static readonly MODIFY_ASSIGNED_GROUP_ERROR =
    'MODIFY_ASSIGNED_GROUP_ERROR';

  // Bank Detail Errors
  public static readonly DELETE_BANK_DETAIL_ERROR = 'DELETE_BANK_DETAIL_ERROR';
  public static readonly ADD_BANK_DETAIL_ERROR = 'ADD_BANK_DETAIL_ERROR';
  public static readonly UPDATE_BANK_DETAIL_ERROR = 'UPDATE_BANK_DETAIL_ERROR';
  public static readonly MODIFY_BANK_DETAIL_ERROR = 'MODIFY_BANK_DETAIL_ERROR';

  // Break Errors
  public static readonly DELETE_BREAK_ERROR = 'DELETE_BREAK_ERROR';
  public static readonly ADD_BREAK_ERROR = 'ADD_BREAK_ERROR';
  public static readonly UPDATE_BREAK_ERROR = 'UPDATE_BREAK_ERROR';
  public static readonly MODIFY_BREAK_ERROR = 'MODIFY_BREAK_ERROR';

  // Calendar Rule Errors
  public static readonly DELETE_CALENDAR_RULE_ERROR =
    'DELETE_CALENDAR_RULE_ERROR';
  public static readonly ADD_CALENDAR_RULE_ERROR = 'ADD_CALENDAR_RULE_ERROR';
  public static readonly UPDATE_CALENDAR_RULE_ERROR =
    'UPDATE_CALENDAR_RULE_ERROR';
  public static readonly MODIFY_CALENDAR_RULE_ERROR =
    'MODIFY_CALENDAR_RULE_ERROR';

  // Calendar Selection Errors
  public static readonly DELETE_CALENDAR_SELECTION_ERROR =
    'DELETE_CALENDAR_SELECTION_ERROR';
  public static readonly ADD_CALENDAR_SELECTION_ERROR =
    'ADD_CALENDAR_SELECTION_ERROR';
  public static readonly UPDATE_CALENDAR_SELECTION_ERROR =
    'UPDATE_CALENDAR_SELECTION_ERROR';
  public static readonly MODIFY_CALENDAR_SELECTION_ERROR =
    'MODIFY_CALENDAR_SELECTION_ERROR';

  // Selected Calendar Errors
  public static readonly DELETE_SELECTED_CALENDAR_ERROR =
    'DELETE_SELECTED_CALENDAR_ERROR';
  public static readonly ADD_SELECTED_CALENDAR_ERROR =
    'ADD_SELECTED_CALENDAR_ERROR';
  public static readonly UPDATE_SELECTED_CALENDAR_ERROR =
    'UPDATE_SELECTED_CALENDAR_ERROR';
  public static readonly MODIFY_SELECTED_CALENDAR_ERROR =
    'MODIFY_SELECTED_CALENDAR_ERROR';

  // Country Errors
  public static readonly DELETE_COUNTRY_ERROR = 'DELETE_COUNTRY_ERROR';
  public static readonly ADD_COUNTRY_ERROR = 'ADD_COUNTRY_ERROR';
  public static readonly UPDATE_COUNTRY_ERROR = 'UPDATE_COUNTRY_ERROR';
  public static readonly MODIFY_COUNTRY_ERROR = 'MODIFY_COUNTRY_ERROR';

  // State Errors
  public static readonly DELETE_STATE_ERROR = 'DELETE_STATE_ERROR';
  public static readonly ADD_STATE_ERROR = 'ADD_STATE_ERROR';
  public static readonly UPDATE_STATE_ERROR = 'UPDATE_STATE_ERROR';
  public static readonly MODIFY_STATE_ERROR = 'MODIFY_STATE_ERROR';

  // Group Errors
  public static readonly DELETE_GROUP_ERROR = 'DELETE_GROUP_ERROR';
  public static readonly ADD_GROUP_ERROR = 'ADD_GROUP_ERROR';
  public static readonly UPDATE_GROUP_ERROR = 'UPDATE_GROUP_ERROR';
  public static readonly MODIFY_GROUP_ERROR = 'MODIFY_GROUP_ERROR';

  // File Errors
  public static readonly DELETE_FILE_ERROR = 'DELETE_FILE_ERROR';
  public static readonly ADD_FILE_ERROR = 'ADD_FILE_ERROR';
  public static readonly UPDATE_FILE_ERROR = 'UPDATE_FILE_ERROR';
  public static readonly MODIFY_FILE_ERROR = 'MODIFY_FILE_ERROR';

  // Macro Errors
  public static readonly DELETE_MACRO_ERROR = 'DELETE_MACRO_ERROR';
  public static readonly ADD_MACRO_ERROR = 'ADD_MACRO_ERROR';
  public static readonly UPDATE_MACRO_ERROR = 'UPDATE_MACRO_ERROR';
  public static readonly MODIFY_MACRO_ERROR = 'MODIFY_MACRO_ERROR';

  // Work Errors
  public static readonly DELETE_WORK_ERROR = 'DELETE_WORK_ERROR';
  public static readonly ADD_WORK_ERROR = 'ADD_WORK_ERROR';
  public static readonly UPDATE_WORK_ERROR = 'UPDATE_WORK_ERROR';
  public static readonly MODIFY_WORK_ERROR = 'MODIFY_WORK_ERROR';

  // Shift Errors
  public static readonly DELETE_SHIFT_ERROR = 'DELETE_SHIFT_ERROR';
  public static readonly ADD_SHIFT_ERROR = 'ADD_SHIFT_ERROR';
  public static readonly UPDATE_SHIFT_ERROR = 'UPDATE_SHIFT_ERROR';
  public static readonly MODIFY_SHIFT_ERROR = 'MODIFY_SHIFT_ERROR';

  // Address Errors
  public static readonly DELETE_ADDRESS_ERROR = 'DELETE_ADDRESS_ERROR';
  public static readonly ADD_ADDRESS_ERROR = 'ADD_ADDRESS_ERROR';
  public static readonly UPDATE_ADDRESS_ERROR = 'UPDATE_ADDRESS_ERROR';
  public static readonly MODIFY_ADDRESS_ERROR = 'MODIFY_ADDRESS_ERROR';

  // Communication Errors
  public static readonly DELETE_COMMUNICATION_ERROR =
    'DELETE_COMMUNICATION_ERROR';
  public static readonly ADD_COMMUNICATION_ERROR = 'ADD_COMMUNICATION_ERROR';
  public static readonly UPDATE_COMMUNICATION_ERROR =
    'UPDATE_COMMUNICATION_ERROR';
  public static readonly MODIFY_COMMUNICATION_ERROR =
    'MODIFY_COMMUNICATION_ERROR';

  // Setting Errors
  public static readonly DELETE_SETTING_ERROR = 'DELETE_SETTING_ERROR';
  public static readonly ADD_SETTING_ERROR = 'ADD_SETTING_ERROR';
  public static readonly UPDATE_SETTING_ERROR = 'UPDATE_SETTING_ERROR';
  public static readonly MODIFY_SETTING_ERROR = 'MODIFY_SETTING_ERROR';

  // Generic Entry Errors (fallback)
  public static readonly DELETE_ENTRY_ERROR = 'DELETE_ENTRY_ERROR';
  public static readonly ADD_ENTRY_ERROR = 'ADD_ENTRY_ERROR';
  public static readonly UPDATE_ENTRY_ERROR = 'UPDATE_ENTRY_ERROR';
  public static readonly MODIFY_ENTRY_ERROR = 'MODIFY_ENTRY_ERROR';
}
