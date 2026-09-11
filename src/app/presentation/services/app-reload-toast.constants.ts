// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Toast name, translation keys and interpolation parameter of the reload toasts. The countdown texts
 * interpolate the remaining seconds as {{seconds}}.
 */
export const APP_RELOAD_TOAST = {
  NAME: 'app-reload',
  SECONDS_PARAM: 'seconds',
  KEYS: {
    UPDATE_AVAILABLE: 'app-reload.update-available',
    UPDATE_COUNTDOWN: 'app-reload.update-countdown',
    RECONNECTED_AVAILABLE: 'app-reload.reconnected-available',
    RECONNECTED_COUNTDOWN: 'app-reload.reconnected-countdown',
    RELOAD: 'app-reload.reload',
    NOW: 'app-reload.now',
    LATER: 'app-reload.later',
  },
} as const;
