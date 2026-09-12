// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Key under which a route declares the right permissionGuard demands. It is read from
 * route.data by the guard and compared against the Klacksy page-keys by a spec, so both sides
 * name the same constant instead of repeating a string literal.
 */
export const ROUTE_DATA_REQUIRED_PERMISSION = 'requiredPermission';
