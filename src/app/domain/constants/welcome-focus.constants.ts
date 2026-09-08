// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Option values and i18n keys of the welcome focus toast. The two option values deliberately do
 * not start with "/workplace/": the toast callback sends every value carrying that prefix straight
 * into navigation, so a focus value with it would be swallowed before the focus branch is reached.
 */
export const WELCOME_FOCUS_ACTION_KIND = {
  Navigate: 'navigate',
  Consultation: 'consultation',
} as const;

export const WELCOME_FOCUS_ACTION = 'welcome-focus:action';

export const WELCOME_FOCUS_LATER = 'welcome-focus:later';

export const WELCOME_FOCUS_LATER_LABEL_KEY = 'klacksy.focus.later';

export const WELCOME_FOCUS_FALLBACK_PROMPT_KEY = 'assistant-chat.action-toast.prompt';

export const WELCOME_FOCUS_DATE_PARAM_KEYS = ['periodEnd', 'periodStart'] as const;
