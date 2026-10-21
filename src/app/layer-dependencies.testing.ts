// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Import scanner behind the layer dependency guard: walks the production sources under src/app, resolves every
 * module specifier (static, type-only, re-export and dynamic import) to a file and classifies importer and target by
 * layer. Used by layer-dependencies.guard.spec.ts and by tools/generate-layer-allowlist.ts, so both judge exactly the
 * same edges. Only src/app is scanned; the plugin libraries under projects/ are not covered. Owner decision
 * 2026-10-20: domain/services and application may import infrastructure/api, infrastructure/storage and
 * infrastructure/signalr; presentation -> infrastructure stays forbidden and is frozen in the legacy list.
 * @param appRoot - Absolute path of src/app
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import * as ts from 'typescript';

export type Layer = 'domain' | 'application' | 'infrastructure' | 'shared' | 'presentation';

export type Zone = 'composition-root' | 'outside-app' | 'unknown' | Layer;

export interface ILayerEdge {
  readonly file: string;
  readonly specifier: string;
  readonly target: string;
  readonly fromZone: Zone;
  readonly toZone: Zone;
  readonly fromDomainCore: boolean;
}

export const LAYERS: readonly Layer[] = ['domain', 'application', 'infrastructure', 'shared', 'presentation'];

export const ALLOWED_LAYER_DEPENDENCIES: Readonly<Record<Layer, readonly Layer[]>> = {
  presentation: ['application', 'domain', 'shared'],
  application: ['domain'],
  domain: [],
  infrastructure: ['domain'],
  shared: ['domain'],
};

const SOURCE_EXTENSION = '.ts';
const SPEC_SUFFIX = '.spec.ts';
const TESTING_SUFFIX = '.testing.ts';
const TESTING_FOLDER = 'testing';
const SKIPPED_FOLDERS: readonly string[] = ['node_modules', TESTING_FOLDER];
const APP_ALIAS = 'src/app/';
const SRC_ALIAS = 'src/';
const DOMAIN_SERVICES_PREFIX = 'domain/services/';
const UNRESTRICTED_INFRASTRUCTURE_FOLDERS: readonly string[] = ['api', 'storage', 'signalr'];
const INFRASTRUCTURE_FOLDER_SEGMENT_INDEX = 1;
const INDEX_FILE = '/index.ts';
const PARENT_SEGMENT = '..';

const toPosix = (value: string): string => value.split('\\').join('/');

export function isProductionSource(appRelativePath: string): boolean {
  const lower = appRelativePath.toLowerCase();
  return (
    lower.endsWith(SOURCE_EXTENSION) &&
    !lower.endsWith(SPEC_SUFFIX) &&
    !lower.endsWith(TESTING_SUFFIX) &&
    !lower.split('/').includes(TESTING_FOLDER)
  );
}

export function zoneOf(appRelativePath: string): Zone {
  const path = toPosix(appRelativePath).toLowerCase();
  if (path === PARENT_SEGMENT || path.startsWith(PARENT_SEGMENT + '/')) {
    return 'outside-app';
  }
  const segments = path.split('/');
  if (segments.length === 1) {
    return 'composition-root';
  }
  return (LAYERS as readonly string[]).includes(segments[0]) ? (segments[0] as Layer) : 'unknown';
}

export function isDomainCore(appRelativePath: string): boolean {
  const path = toPosix(appRelativePath).toLowerCase();
  return zoneOf(path) === 'domain' && !path.startsWith(DOMAIN_SERVICES_PREFIX);
}

export function extractModuleSpecifiers(source: string): string[] {
  return ts.preProcessFile(source, true, true).importedFiles.map((imported) => imported.fileName);
}

function listSources(directory: string, appRoot: string, found: string[]): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_FOLDERS.includes(entry.name.toLowerCase())) {
        listSources(fullPath, appRoot, found);
      }
    } else if (isProductionSource(toPosix(relative(appRoot, fullPath)))) {
      found.push(fullPath);
    }
  }
  return found;
}

function resolveSpecifier(specifier: string, importer: string, appRoot: string): string | null {
  let base: string;
  if (specifier.startsWith('.')) {
    base = resolve(dirname(importer), specifier);
  } else if (specifier.startsWith(APP_ALIAS)) {
    base = resolve(appRoot, specifier.slice(APP_ALIAS.length));
  } else if (specifier.startsWith(SRC_ALIAS)) {
    base = resolve(appRoot, PARENT_SEGMENT, specifier.slice(SRC_ALIAS.length));
  } else {
    return null;
  }
  const candidates = [base + SOURCE_EXTENSION, base + INDEX_FILE, base];
  const hit = candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
  return hit ?? base;
}

export function scanProductionSources(appRoot: string): { files: string[]; edges: ILayerEdge[] } {
  const files = listSources(appRoot, appRoot, []).map((file) => toPosix(relative(appRoot, file))).sort();
  const edges: ILayerEdge[] = [];
  for (const file of files) {
    const absolute = join(appRoot, file);
    for (const specifier of extractModuleSpecifiers(readFileSync(absolute, 'utf8'))) {
      const resolved = resolveSpecifier(specifier, absolute, appRoot);
      if (resolved === null) {
        continue;
      }
      const target = toPosix(relative(appRoot, resolved));
      edges.push({
        file,
        specifier,
        target,
        fromZone: zoneOf(file),
        toZone: zoneOf(target),
        fromDomainCore: isDomainCore(file),
      });
    }
  }
  return { files, edges };
}

export function isLayer(zone: Zone): zone is Layer {
  return (LAYERS as readonly string[]).includes(zone);
}

/**
 * Edges forbidden under every reading of frontend-architecture.md (table and prose alike): nothing below
 * presentation reaches into presentation, domain/infrastructure/shared never reach into application, the domain
 * core (everything in domain/ except domain/services) never reaches into infrastructure, and no layer imports the
 * composition root.
 */
export function isZeroToleranceViolation(edge: ILayerEdge): boolean {
  const { fromZone, toZone } = edge;
  if (!isLayer(fromZone) || fromZone === toZone) {
    return false;
  }
  if (toZone === 'composition-root') {
    return true;
  }
  if (toZone === 'presentation') {
    return true;
  }
  if (toZone === 'application' && fromZone !== 'presentation') {
    return true;
  }
  return edge.fromDomainCore && toZone === 'infrastructure';
}

/**
 * Owner decision 2026-10-20: domain/services may inject the data-* API services, storage and SignalR from
 * infrastructure/api, infrastructure/storage and infrastructure/signalr directly. application sits outward of
 * domain/services, so it cannot be stricter and gets the same allowance. The domain core (everything in domain/ outside
 * domain/services) never gets it, and the other infrastructure folders (scripting, helpers, ...) are not covered.
 */
export function isAllowedInfrastructureAccess(edge: ILayerEdge): boolean {
  if (edge.toZone !== 'infrastructure' || edge.fromDomainCore) {
    return false;
  }
  if (edge.fromZone !== 'application' && edge.fromZone !== 'domain') {
    return false;
  }
  const folder = toPosix(edge.target).toLowerCase().split('/')[INFRASTRUCTURE_FOLDER_SEGMENT_INDEX];
  return UNRESTRICTED_INFRASTRUCTURE_FOLDERS.includes(folder);
}

export function isTableViolation(edge: ILayerEdge): boolean {
  const { fromZone, toZone } = edge;
  if (!isLayer(fromZone) || !isLayer(toZone) || fromZone === toZone) {
    return false;
  }
  if (isAllowedInfrastructureAccess(edge)) {
    return false;
  }
  return !ALLOWED_LAYER_DEPENDENCIES[fromZone].includes(toZone);
}

/**
 * Edges the table allows but that stay frozen all the same: shared -> domain keeps domain and shared in a cycle
 * (domain imports shared helpers), so it is listed with the legacy violations until the two are untangled.
 */
export function isFrozenAllowedEdge(edge: ILayerEdge): boolean {
  return edge.fromZone === 'shared' && edge.toZone === 'domain';
}

export function legacyViolationMap(edges: readonly ILayerEdge[]): Record<string, Layer[]> {
  const map: Record<string, Set<Layer>> = {};
  for (const edge of edges) {
    if ((isTableViolation(edge) || isFrozenAllowedEdge(edge)) && !isZeroToleranceViolation(edge)) {
      (map[edge.file] ??= new Set<Layer>()).add(edge.toZone as Layer);
    }
  }
  const sorted: Record<string, Layer[]> = {};
  for (const file of Object.keys(map).sort()) {
    sorted[file] = [...map[file]].sort();
  }
  return sorted;
}
