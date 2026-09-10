// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Route that marks a Klacksy target as part of the app shell (header search, assistant-chat panels)
 * rather than of one page. The target scanner assigns it to every template outside a routed page,
 * and navigation must never follow it: the root route redirects to the login screen, so navigating
 * there would tear the whole shell down instead of highlighting an element that is already on screen.
 */
export const KLACKSY_GLOBAL_TARGET_ROUTE = '/';
