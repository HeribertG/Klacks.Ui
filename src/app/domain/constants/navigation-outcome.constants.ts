// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Wire values and i18n keys of the honest navigation feedback (W0). The reasons describe why a
 * navigation fell short in the browser; the outcomes are what the backend accepts on
 * eval/navigation-outcome and stores as UserAction in klacksy_navigation_feedback.
 */
export const NAVIGATION_REASON_TARGET_NOT_FOUND = 'target-not-found';

export const NAVIGATION_REASON_PERMISSION_DENIED = 'permission-denied';

export const NAVIGATION_OUTCOME_SCROLLED = 'scrolled';

export const NAVIGATION_OUTCOME_TARGET_MISS = 'target-miss';

export const NAVIGATION_OUTCOME_PERMISSION_DENIED = 'permission-denied';

/** Backend truncates at 500 characters; trimming here keeps the request small. */
export const NAVIGATION_OUTCOME_MAX_UTTERANCE_LENGTH = 500;

export const NAV_CORRECTION_TARGET_NOT_FOUND_KEY = 'nav.correction.targetNotFound';

export const NAV_CORRECTION_PERMISSION_DENIED_KEY = 'nav.fail.permissionDenied';

/** Only routes below this prefix may be navigated to on the model's word. */
export const WORKPLACE_ROUTE_PREFIX = '/workplace/';

/**
 * A route the model invented outside the workplace prefix. This is a safety refusal, not a rights
 * problem and not a missing marker - the browser never navigated, so the user gets no correction
 * sentence for it, only telemetry.
 */
export const NAVIGATION_ROUTE_NOT_ALLOWED_ERROR = 'Navigation target not allowed';

/**
 * A navigation content chunk that is nothing but a bare i18n key. The backend streams its
 * acknowledgements as keys on purpose (NavigationResponseKeys: "The frontend resolves them via its
 * translation store"), so the chat has to do that resolving. Real prose can never match: it is a
 * whole message consisting of one dotted nav token and nothing else.
 */
export const NAVIGATION_CONTENT_KEY_PATTERN = /^nav\.[A-Za-z]+\.[A-Za-z]+$/;
