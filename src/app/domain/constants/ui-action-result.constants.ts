// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Wire values of the UiAction outcome report (W1.4). The backend parses the status case-insensitively
 * and rejects anything other than these two words with a 400, so they are not free text.
 */
export const UI_ACTION_RESULT_STATUS_COMPLETED = 'completed';

export const UI_ACTION_RESULT_STATUS_FAILED = 'failed';

/** Backend truncates at 500 characters; trimming here keeps the request small. */
export const UI_ACTION_RESULT_MAX_ERROR_LENGTH = 500;

/** Reported when a dispatch arrives with a config that has no steps to execute. */
export const UI_ACTION_RESULT_EMPTY_CONFIG_ERROR = 'UiAction config contained no steps';

/** Reported when the browser threw or failed without giving a message. */
export const UI_ACTION_RESULT_UNKNOWN_ERROR = 'UI action execution failed';
