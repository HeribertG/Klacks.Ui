// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Route } from '@angular/router';
import { routes } from '../../app-routing.module';
import { AuthGuard } from '../../presentation/auth/auth.guard';
import { permissionGuard } from '../../presentation/auth/permission.guard';
import { ROUTE_DATA_REQUIRED_PERMISSION } from '../../presentation/auth/route-data.constants';
import { KLACKSY_PAGE_KEYS } from './klacksy-page-keys';
import { PERMISSIONS, ROLE_ADMIN, ROLE_AUTHORISED } from './permissions.constants';

const WORKPLACE_ROUTE_PATH = 'workplace';
const WORKPLACE_ROUTE_PREFIX = '/workplace/';
const ROUTE_ENTITY_PARAM_SUFFIX = '/:id';
const ROUTE_PARAM_SEGMENT_REGEX = /\/:[^/]+$/;
const ROUTE_QUERY_STRING_SEPARATOR = '?';
const ROUTE_PATH_SEPARATOR = '/';
const CREATE_PAGE_KEY_PREFIX = 'new-';
const EDIT_PAGE_KEY_PREFIX = 'edit-';

interface FlatRoute {
  fullPath: string;
  route: Route;
}

// Everything a route or a page-key may legitimately name as a right: the granular permissions the
// backend expands plus the two role names that travel in the same list.
const KNOWN_RIGHTS: ReadonlySet<string> = new Set<string>([
  ...Object.values(PERMISSIONS),
  ROLE_ADMIN,
  ROLE_AUTHORISED,
]);

// Every /workplace child route now has a page-key; the set stays as the documented escape hatch
// for a route that must deliberately stay invisible to Klacksy, with a reason recorded here.
const PAGE_KEY_COVERAGE_EXCEPTIONS: ReadonlySet<string> = new Set<string>([]);

// Guards that gate a right or a login, never the existence of a feature. Anything else in a
// route's canActivate is treated as a feature guard (featurePluginGuard(name), InboxGuard) and
// must have a requiredFeature on the page-key. Starts closed on purpose: a new unrelated guard
// fails this spec loudly instead of silently widening the feature rule.
const KNOWN_NON_FEATURE_GUARDS: readonly unknown[] = [AuthGuard, permissionGuard];

function stripQueryString(route: string): string {
  const separatorIndex = route.indexOf(ROUTE_QUERY_STRING_SEPARATOR);
  return separatorIndex === -1 ? route : route.slice(0, separatorIndex);
}

function getWorkplaceChildren(): Route[] {
  const workplaceRoute = routes.find((r) => r.path === WORKPLACE_ROUTE_PATH);
  if (!workplaceRoute?.children) {
    throw new Error('Could not locate the /workplace route with children in app-routing.module.ts');
  }
  return workplaceRoute.children;
}

// Every statically declared route, parents included, so a guard sitting on a top-level route such as
// setup is checked like a /workplace child. Lazy children behind loadChildren (messaging, floor-plan)
// stay out: their route arrays live in a plugin package and are not resolvable from source.
function flattenRoutes(routeList: readonly Route[], parentPath: string): FlatRoute[] {
  const flattened: FlatRoute[] = [];
  for (const route of routeList) {
    const path = route.path ?? '';
    const fullPath = [parentPath, path].filter((segment) => segment.length > 0).join(ROUTE_PATH_SEPARATOR);
    flattened.push({ fullPath, route });
    if (route.children) {
      flattened.push(...flattenRoutes(route.children, fullPath));
    }
  }
  return flattened;
}

// The Angular child path a page-key points at. A page-key for a destination that takes an entity
// id lands on the parameterised route, not on the parameterless one - and since Option B the two
// can demand different rights, so they must not be collapsed into one segment here.
function childPathOf(route: string, hasEntityParam: boolean): string {
  const segment = stripQueryString(route).replace(WORKPLACE_ROUTE_PREFIX, '');
  return hasEntityParam ? segment + ROUTE_ENTITY_PARAM_SUFFIX : segment;
}

function declaredPermission(child: Route): string | null {
  return (child.data?.[ROUTE_DATA_REQUIRED_PERMISSION] as string | undefined) ?? null;
}

describe('Klacksy page-keys mirror the Angular /workplace guards', () => {
  const children = getWorkplaceChildren();
  const allRoutes = flattenRoutes(routes, '');

  const parameterlessChildPaths = children
    .map((c) => c.path)
    .filter((path): path is string => !!path && !ROUTE_PARAM_SEGMENT_REGEX.test('/' + path));

  const permissionByChildPath = new Map<string, string | null>();
  for (const child of children) {
    if (!child.path) continue;
    permissionByChildPath.set(child.path, declaredPermission(child));
  }

  const segmentsWithFeatureGuard = new Set<string>();
  for (const child of children) {
    if (!child.path) continue;
    const segment = child.path.replace(ROUTE_PARAM_SEGMENT_REGEX, '');
    const hasFeatureGuard = (child.canActivate ?? []).some(
      (guard) => !KNOWN_NON_FEATURE_GUARDS.includes(guard),
    );
    if (hasFeatureGuard) {
      segmentsWithFeatureGuard.add(segment);
    }
  }

  it('has a page-key for every parameterless /workplace child route, except the documented exceptions', () => {
    const missing = parameterlessChildPaths.filter((path) => {
      const expectedRoute = WORKPLACE_ROUTE_PREFIX + path;
      const hasPageKey = KLACKSY_PAGE_KEYS.some((pk) => stripQueryString(pk.route) === expectedRoute);
      return !hasPageKey;
    });

    const undocumentedMissing = missing.filter((path) => !PAGE_KEY_COVERAGE_EXCEPTIONS.has(path));
    expect(undocumentedMissing).toEqual([]);

    const staleExceptions = [...PAGE_KEY_COVERAGE_EXCEPTIONS].filter((path) => !missing.includes(path));
    expect(staleExceptions).toEqual([]);
  });

  it('gives every page-key exactly the permission its route declares for permissionGuard', () => {
    const mismatches: string[] = [];
    for (const pk of KLACKSY_PAGE_KEYS) {
      const childPath = childPathOf(pk.route, pk.hasEntityParam);
      if (!permissionByChildPath.has(childPath)) {
        mismatches.push(`${pk.pageKey}: route "${pk.route}" has no matching /workplace child route`);
        continue;
      }
      const expectedPermission = permissionByChildPath.get(childPath) ?? null;
      if (pk.requiredPermission !== expectedPermission) {
        mismatches.push(
          `${pk.pageKey}: requiredPermission is "${pk.requiredPermission}", but route "${childPath}" ` +
            `declares "${expectedPermission}"`,
        );
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('puts permissionGuard on every statically declared route that declares a permission', () => {
    const unguarded = allRoutes
      .filter((entry) => declaredPermission(entry.route) !== null)
      .filter((entry) => !(entry.route.canActivate ?? []).includes(permissionGuard))
      .map((entry) => entry.fullPath);

    expect(unguarded).toEqual([]);
  });

  // The other direction, and the reason permissionGuard may be fail-closed: the guard can only ever
  // check data[ROUTE_DATA_REQUIRED_PERMISSION], so a route carrying it without that entry would be
  // refused at runtime for everyone. Catching that here turns a silent lock-out into a red test.
  it('gives every route carrying permissionGuard a declared requiredPermission', () => {
    const guardedWithoutData = allRoutes
      .filter((entry) => (entry.route.canActivate ?? []).includes(permissionGuard))
      .filter((entry) => declaredPermission(entry.route) === null)
      .map((entry) => entry.fullPath);

    expect(guardedWithoutData).toEqual([]);
  });

  it('names a right the backend actually expands on every route that declares one', () => {
    const unknown = allRoutes
      .map((entry) => ({ fullPath: entry.fullPath, permission: declaredPermission(entry.route) }))
      .filter((entry) => entry.permission !== null && !KNOWN_RIGHTS.has(entry.permission))
      .map((entry) => `${entry.fullPath}: "${entry.permission}"`);

    expect(unknown).toEqual([]);
  });

  // actionPermission belongs on the two page-key shapes that exist to write: a parameterless create
  // key and an edit key. Putting one on a plain list or overview key would make Klacksy refuse a
  // page a click opens fine, which is exactly the asymmetry requiredPermission exists to prevent.
  it('allows actionPermission only on a parameterless create page-key or an edit page-key', () => {
    const misplaced = KLACKSY_PAGE_KEYS.filter((pk) => pk.actionPermission !== undefined)
      .filter((pk) => {
        const isCreateKey = pk.pageKey.startsWith(CREATE_PAGE_KEY_PREFIX) && !pk.hasEntityParam;
        const isEditKey = pk.pageKey.startsWith(EDIT_PAGE_KEY_PREFIX);
        return !isCreateKey && !isEditKey;
      })
      .map((pk) => pk.pageKey);

    expect(misplaced).toEqual([]);
  });

  it('names a right the backend actually expands in every actionPermission', () => {
    const unknown = KLACKSY_PAGE_KEYS.filter(
      (pk) => pk.actionPermission !== undefined && !KNOWN_RIGHTS.has(pk.actionPermission),
    ).map((pk) => `${pk.pageKey}: "${pk.actionPermission}"`);

    expect(unknown).toEqual([]);
  });

  // actionPermission is only ever stricter, never a second spelling of the route permission: an
  // actionPermission equal to requiredPermission adds nothing and hides that the page-key was never
  // reviewed against the guard.
  it('keeps every actionPermission distinct from the requiredPermission of its route', () => {
    const redundant = KLACKSY_PAGE_KEYS.filter(
      (pk) => pk.actionPermission !== undefined && pk.actionPermission === pk.requiredPermission,
    ).map((pk) => pk.pageKey);

    expect(redundant).toEqual([]);
  });

  // Only requiredPermission has to agree: it mirrors one guard on one route. actionPermission is
  // deliberately per page-key, so new-group (create) and edit-group (edit) share a route and a route
  // permission while asking for different write rights.
  it('gives page-keys landing on the same Angular route the same requiredPermission', () => {
    const permissionByRoute = new Map<string, string | null>();
    const conflicts: string[] = [];
    for (const pk of KLACKSY_PAGE_KEYS) {
      const childPath = childPathOf(pk.route, pk.hasEntityParam);
      if (!permissionByRoute.has(childPath)) {
        permissionByRoute.set(childPath, pk.requiredPermission);
        continue;
      }
      if (permissionByRoute.get(childPath) !== pk.requiredPermission) {
        conflicts.push(
          `${pk.pageKey}: route "${childPath}" has requiredPermission "${pk.requiredPermission}", ` +
            `but another page-key for the same route has "${permissionByRoute.get(childPath)}"`,
        );
      }
    }
    expect(conflicts).toEqual([]);
  });

  // What this cannot check: featurePluginGuard(name) is a factory that returns a fresh closure, so
  // the plugin NAME it was called with is not readable from the route definition. A requiredFeature
  // holding a typo therefore passes here and only shows up at runtime, where the backend
  // FeatureAvailabilityService logs an unknown-feature warning and refuses the page (fail-closed).
  it('gives every feature-guarded route a requiredFeature, and every other route none', () => {
    const segmentsWithRequiredFeature = new Set(
      KLACKSY_PAGE_KEYS.filter((pk) => pk.requiredFeature !== undefined).map((pk) =>
        stripQueryString(pk.route).replace(WORKPLACE_ROUTE_PREFIX, ''),
      ),
    );

    const missingFeature = [...segmentsWithFeatureGuard].filter(
      (segment) => !segmentsWithRequiredFeature.has(segment),
    );
    const unexpectedFeature = [...segmentsWithRequiredFeature].filter(
      (segment) => !segmentsWithFeatureGuard.has(segment),
    );

    expect(missingFeature).toEqual([]);
    expect(unexpectedFeature).toEqual([]);
  });

  it('gives page-keys sharing the same route the same requiredFeature', () => {
    const featureByRoute = new Map<string, string | undefined>();
    const conflicts: string[] = [];
    for (const pk of KLACKSY_PAGE_KEYS) {
      const route = stripQueryString(pk.route);
      if (!featureByRoute.has(route)) {
        featureByRoute.set(route, pk.requiredFeature);
        continue;
      }
      if (featureByRoute.get(route) !== pk.requiredFeature) {
        conflicts.push(
          `${pk.pageKey}: route "${route}" has requiredFeature "${pk.requiredFeature}", ` +
            `but another page-key for the same route has "${featureByRoute.get(route)}"`,
        );
      }
    }
    expect(conflicts).toEqual([]);
  });

  it('never mistakes a featurePluginGuard-protected route for a rights-guarded one (guards are distinct function references)', () => {
    const messaging = children.find((c) => c.path === 'messaging');
    const floorPlan = children.find((c) => c.path === 'floor-plan');
    expect(messaging?.canActivate?.includes(permissionGuard)).toBe(false);
    expect(floorPlan?.canActivate?.includes(permissionGuard)).toBe(false);
    expect(declaredPermission(messaging as Route)).toBeNull();
    expect(declaredPermission(floorPlan as Route)).toBeNull();
  });
});
