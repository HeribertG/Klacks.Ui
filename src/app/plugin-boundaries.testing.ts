// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Import scanner behind the plugin boundary guard: walks every TypeScript file of the plugin libraries under
 * projects/ (production code and specs), resolves each module specifier (relative paths, baseUrl paths such as
 * src/... or projects/..., and the path aliases of the root tsconfig.json) to a path relative to the Klacks.Ui root
 * and judges it. A plugin may import its own files, klacks-plugin-contracts and third-party packages; it may not
 * import the host (src/) or another plugin. klacks-plugin-contracts may import only itself. Inside a plugin that has
 * its own domain/application/infrastructure folders, the same inward direction as in the host applies: components
 * and services/ (the outer ring) reach infrastructure only through application.
 * Used by plugin-boundaries.guard.spec.ts.
 * @param uiRoot - Absolute path of the Klacks.Ui project root; reported paths are relative to it
 * @param pathAliases - The compilerOptions.paths of the root tsconfig.json (alias pattern -> target paths)
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import * as ts from 'typescript';
import { extractModuleSpecifiers } from './layer-dependencies.testing';

export type PluginLayer = 'domain' | 'application' | 'infrastructure' | 'outer';

export type PathAliases = Readonly<Record<string, readonly string[]>>;

export const PROJECTS_FOLDER = 'projects';
export const CONTRACTS_PLUGIN = 'klacks-plugin-contracts';
export const HOST_OWNER = 'host';
export const OUTSIDE_OWNER = 'outside';

const SOURCE_EXTENSION = '.ts';
const INDEX_FILE = '/index.ts';
const PLUGIN_SOURCE_FOLDER = 'src';
const PLUGIN_LIBRARY_FOLDER = 'lib';
const HOST_SOURCE_PREFIX = 'src/';
const BASE_URL_PREFIXES: readonly string[] = [HOST_SOURCE_PREFIX, `${PROJECTS_FOLDER}/`];
const SKIPPED_FOLDERS: readonly string[] = ['node_modules', 'dist'];
const ROOT_TSCONFIG = 'tsconfig.json';
const ALIAS_WILDCARD = '*';
const PARENT_SEGMENT = '..';
const LAYERED_PLUGIN_MARKER = 'domain';

const INNER_LAYER_DEPENDENCIES: Readonly<Record<Exclude<PluginLayer, 'outer'>, readonly PluginLayer[]>> = {
  domain: ['domain'],
  infrastructure: ['domain', 'infrastructure'],
  application: ['domain', 'application', 'infrastructure'],
};

export interface IPluginImportEdge {
  readonly file: string;
  readonly specifier: string;
  readonly target: string;
  readonly fromPlugin: string;
  readonly toOwner: string;
}

const toPosix = (value: string): string => value.split('\\').join('/');

export function readPathAliases(uiRoot: string): PathAliases {
  const configPath = join(uiRoot, ROOT_TSCONFIG);
  const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
  return (config?.compilerOptions?.paths ?? {}) as PathAliases;
}

function aliasTarget(specifier: string, pathAliases: PathAliases): string | null {
  for (const [pattern, targets] of Object.entries(pathAliases)) {
    if (targets.length === 0) {
      continue;
    }
    if (pattern.endsWith(ALIAS_WILDCARD)) {
      const prefix = pattern.slice(0, -ALIAS_WILDCARD.length);
      if (specifier.startsWith(prefix)) {
        return targets[0].replace(ALIAS_WILDCARD, specifier.slice(prefix.length));
      }
    } else if (specifier === pattern) {
      return targets[0];
    }
  }
  return null;
}

/**
 * Resolves a module specifier of a plugin file to a path relative to the Klacks.Ui root, or null for a third-party
 * package. Paths that leave the Klacks.Ui root keep their leading '..' segments.
 */
export function resolvePluginImport(
  importer: string,
  specifier: string,
  uiRoot: string,
  pathAliases: PathAliases,
): string | null {
  let base: string;
  if (specifier.startsWith('.')) {
    base = resolve(uiRoot, dirname(importer), specifier);
  } else {
    const aliased = aliasTarget(specifier, pathAliases);
    if (aliased !== null) {
      base = resolve(uiRoot, aliased);
    } else if (BASE_URL_PREFIXES.some((prefix) => specifier.startsWith(prefix))) {
      base = resolve(uiRoot, specifier);
    } else {
      return null;
    }
  }
  const candidates = [base + SOURCE_EXTENSION, base + INDEX_FILE, base];
  const hit = candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
  return toPosix(relative(uiRoot, hit ?? base));
}

export function ownerOf(uiRelativePath: string): string {
  const segments = toPosix(uiRelativePath).split('/');
  if (segments[0] === PROJECTS_FOLDER && segments.length > 2) {
    return segments[1];
  }
  if (segments[0] === PARENT_SEGMENT) {
    return OUTSIDE_OWNER;
  }
  return toPosix(uiRelativePath).startsWith(HOST_SOURCE_PREFIX) ? HOST_OWNER : OUTSIDE_OWNER;
}

export function isBoundaryViolation(edge: Pick<IPluginImportEdge, 'fromPlugin' | 'toOwner'>): boolean {
  return edge.toOwner !== edge.fromPlugin && edge.toOwner !== CONTRACTS_PLUGIN;
}

export function pluginLayerOf(uiRelativePath: string): PluginLayer {
  const segments = toPosix(uiRelativePath).split('/');
  const isLibraryPath =
    segments[0] === PROJECTS_FOLDER && segments[2] === PLUGIN_SOURCE_FOLDER && segments[3] === PLUGIN_LIBRARY_FOLDER;
  const folder = isLibraryPath ? segments[4] : undefined;
  return folder === 'domain' || folder === 'application' || folder === 'infrastructure' ? folder : 'outer';
}

export function isInternalLayerViolation(edge: Pick<IPluginImportEdge, 'file' | 'target'>): boolean {
  const from = pluginLayerOf(edge.file);
  const to = pluginLayerOf(edge.target);
  if (from === 'outer') {
    return to === 'infrastructure';
  }
  return !INNER_LAYER_DEPENDENCIES[from].includes(to);
}

export function listPlugins(uiRoot: string): string[] {
  return readdirSync(join(uiRoot, PROJECTS_FOLDER), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export function isLayeredPlugin(uiRoot: string, plugin: string): boolean {
  const marker = join(uiRoot, PROJECTS_FOLDER, plugin, PLUGIN_SOURCE_FOLDER, PLUGIN_LIBRARY_FOLDER, LAYERED_PLUGIN_MARKER);
  return existsSync(marker) && statSync(marker).isDirectory();
}

function listSources(directory: string, uiRoot: string, found: string[]): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_FOLDERS.includes(entry.name.toLowerCase())) {
        listSources(fullPath, uiRoot, found);
      }
    } else if (entry.name.toLowerCase().endsWith(SOURCE_EXTENSION)) {
      found.push(toPosix(relative(uiRoot, fullPath)));
    }
  }
  return found;
}

export function scanPluginSources(uiRoot: string): { filesByPlugin: Record<string, string[]>; edges: IPluginImportEdge[] } {
  const pathAliases = readPathAliases(uiRoot);
  const filesByPlugin: Record<string, string[]> = {};
  const edges: IPluginImportEdge[] = [];
  for (const plugin of listPlugins(uiRoot)) {
    const files = listSources(join(uiRoot, PROJECTS_FOLDER, plugin, PLUGIN_SOURCE_FOLDER), uiRoot, []).sort();
    filesByPlugin[plugin] = files;
    for (const file of files) {
      for (const specifier of extractModuleSpecifiers(readFileSync(join(uiRoot, file), 'utf8'))) {
        const target = resolvePluginImport(file, specifier, uiRoot, pathAliases);
        if (target === null) {
          continue;
        }
        edges.push({ file, specifier, target, fromPlugin: plugin, toOwner: ownerOf(target) });
      }
    }
  }
  return { filesByPlugin, edges };
}
