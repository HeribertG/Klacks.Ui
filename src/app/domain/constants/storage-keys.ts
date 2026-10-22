// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export class StorageKeys {
  public static readonly TOKEN = 'JWT_TOKEN';
  public static readonly TOKEN_EXP = 'JWT_TOKEN_EXP';
  public static readonly TOKEN_SUBJECT = 'JWT_TOKEN_SUBJECT';
  public static readonly TOKEN_USERNAME = 'JWT_TOKEN_USERNAME';
  public static readonly TOKEN_USERID = 'JWT_TOKEN_USERID';
  public static readonly TOKEN_PERMISSIONS = 'JWT_PERMISSIONS';
  public static readonly TOKEN_REFRESHTOKEN = 'JWT_REFRESH';
  public static readonly TOKEN_APPVERSION = 'JWT_APP_VERSION';
  public static readonly CURRENT_LANG = 'CURRENT_LANG';
  public static readonly THEME = 'theme';
  public static readonly WIZARD_AUCTION_RATIO = 'wizard.auctionRatio';
  public static readonly DASHBOARD_SECTION_VISIBILITY = 'dashboard.sectionVisibility';
  public static readonly DASHBOARD_SECTION_ORDER = 'dashboard.sectionOrder';
  public static readonly SETTINGS_EXPERT_MODE = 'settings.expertMode';
  public static readonly GROUP_VIEW_MODE = 'group-view-mode';
  public static readonly SHIFT_EDIT_MODE = 'mode';
  public static readonly RETURN_URL = 'klacks.returnUrl';
  public static readonly CONTAINER_LOCK_INSTANCE_ID = 'klacks.containerLock.instanceId';
  public static readonly SCHEDULE_VIEW_MODE = 'klacks.schedule.viewMode';
  public static readonly SCHEDULE_TIMELINE_VIEW_RANGE = 'klacks.schedule.timelineViewRange';
  public static readonly SCHEDULE_TIMELINE_ROW_HEIGHT_FACTOR = 'klacks.schedule.timelineRowHeightFactor';
  public static readonly SETUP_CONSULTATION_OFFERED = 'klacks.setupConsultation.offeredSession';
  public static readonly PLUGIN_ASSISTANT_OFFERED_PREFIX = 'klacks.pluginAssistantOffer.offeredSession.';
  public static readonly EXPLAIN_OFFER_OFFERED_PREFIX = 'klacks.explainOffer.offeredSession.';
  public static readonly COMPANY_CLOCK_UTC_WARNING_DISMISSED = 'klacks.companyClock.utcWarningDismissedSession';
  public static readonly AUTO_WIZARD_ACTIVE_JOB = 'klacks.autoWizard.activeJobSession';
  public static readonly AUTO_WIZARD_PENDING_SCENARIO = 'klacks.autoWizard.pendingScenarioSession';
}
