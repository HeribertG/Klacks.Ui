// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import {
  CONTRACTS_PLUGIN,
  HOST_OWNER,
  IPluginImportEdge,
  isBoundaryViolation,
  isInternalLayerViolation,
  isLayeredPlugin,
  OUTSIDE_OWNER,
  ownerOf,
  PathAliases,
  pluginLayerOf,
  readPathAliases,
  resolvePluginImport,
  scanPluginSources,
} from './plugin-boundaries.testing';

const APP_ROOT = dirname(fileURLToPath(import.meta.url));
const UI_ROOT = resolve(APP_ROOT, '..', '..');
const EXPECTED_PLUGINS: readonly string[] = [CONTRACTS_PLUGIN, 'klacks-plugin-floor-plan', 'klacks-plugin-messaging'];
const FLOOR_PLAN_FILE = 'projects/klacks-plugin-floor-plan/src/lib/floor-plan-home/floor-plan-home.component.ts';
const MESSAGING_FILE = 'projects/klacks-plugin-messaging/src/lib/services/data-messaging.service.ts';

const BOUNDARY_RULE =
  'A plugin under projects/ builds only against its public contract: it may import its own files, ' +
  `${CONTRACTS_PLUGIN} and third-party packages, never the host (src/app, src/environments, relative paths into src/) ` +
  `and never another plugin. ${CONTRACTS_PLUGIN} imports only itself. What a plugin needs from the host goes through ` +
  `an interface + InjectionToken in ${CONTRACTS_PLUGIN}, bound in src/app/app.plugin-host.ts; presentation pieces ` +
  'the host does not export (icons, list cards, pagination) get a plugin-own component.';

const describeEdges = (edges: readonly IPluginImportEdge[]): string =>
  edges.map((edge) => `  ${edge.file} -> ${edge.target} ('${edge.specifier}')`).join('\n');

describe('plugin boundaries', () => {
  const pathAliases: PathAliases = readPathAliases(UI_ROOT);
  const { filesByPlugin, edges } = scanPluginSources(UI_ROOT);
  const resolveFrom = (importer: string, specifier: string): string | null =>
    resolvePluginImport(importer, specifier, UI_ROOT, pathAliases);

  describe('scanner', () => {
    it('resolves host paths, relative escapes into src/ and plugin aliases, and ignores third-party packages', () => {
      // Arrange / Act / Assert
      expect(resolveFrom(FLOOR_PLAN_FILE, 'src/app/presentation/toast/toast-show.service')).toBe(
        'src/app/presentation/toast/toast-show.service.ts',
      );
      expect(resolveFrom(FLOOR_PLAN_FILE, 'src/environments/environment')).toBe('src/environments/environment.ts');
      expect(resolveFrom(FLOOR_PLAN_FILE, '../../../../../src/app/app.config')).toBe('src/app/app.config.ts');
      expect(resolveFrom(MESSAGING_FILE, 'projects/klacks-plugin-floor-plan/src/public-api')).toBe(
        'projects/klacks-plugin-floor-plan/src/public-api.ts',
      );
      expect(resolveFrom(MESSAGING_FILE, 'klacks-plugin-floor-plan')).toBe(
        'projects/klacks-plugin-floor-plan/src/public-api.ts',
      );
      expect(resolveFrom(MESSAGING_FILE, '@floor-plan-plugin/domain/models/floor-plan.interface')).toBe(
        'projects/klacks-plugin-floor-plan/src/lib/domain/models/floor-plan.interface.ts',
      );
      expect(resolveFrom(MESSAGING_FILE, CONTRACTS_PLUGIN)).toBe('projects/klacks-plugin-contracts/src/public-api.ts');
      expect(resolveFrom(MESSAGING_FILE, '../models/message.model')).toBe(
        'projects/klacks-plugin-messaging/src/lib/models/message.model.ts',
      );
      expect(resolveFrom(MESSAGING_FILE, '@angular/core')).toBeNull();
      expect(resolveFrom(MESSAGING_FILE, 'rxjs')).toBeNull();
    });

    it('allows own files and the contracts, forbids the host, other plugins and paths outside Klacks.Ui', () => {
      // Arrange
      const plugin = 'klacks-plugin-messaging';
      const judge = (target: string): boolean => isBoundaryViolation({ fromPlugin: plugin, toOwner: ownerOf(target) });

      // Act / Assert
      expect(ownerOf('src/app/presentation/toast/toast-show.service.ts')).toBe(HOST_OWNER);
      expect(ownerOf('../Klacks.Api/x.ts')).toBe(OUTSIDE_OWNER);
      expect(judge('projects/klacks-plugin-messaging/src/lib/models/message.model.ts')).toBe(false);
      expect(judge('projects/klacks-plugin-contracts/src/public-api.ts')).toBe(false);
      expect(judge('src/app/presentation/toast/toast-show.service.ts')).toBe(true);
      expect(judge('src/environments/environment.ts')).toBe(true);
      expect(judge('projects/klacks-plugin-floor-plan/src/public-api.ts')).toBe(true);
      expect(judge('../Klacks.Api/x.ts')).toBe(true);
      expect(
        isBoundaryViolation({ fromPlugin: CONTRACTS_PLUGIN, toOwner: 'klacks-plugin-messaging' }),
      ).toBe(true);
    });

    it('applies the inward layer direction inside a plugin with domain/application/infrastructure folders', () => {
      // Arrange
      const lib = 'projects/klacks-plugin-floor-plan/src/lib';
      const edge = (from: string, to: string) => ({ file: `${lib}/${from}`, target: `${lib}/${to}` });

      // Act / Assert
      expect(pluginLayerOf(`${lib}/domain/models/floor-plan.interface.ts`)).toBe('domain');
      expect(pluginLayerOf(`${lib}/floor-plan-home/floor-plan-home.component.ts`)).toBe('outer');
      expect(isInternalLayerViolation(edge('domain/a.ts', 'domain/b.ts'))).toBe(false);
      expect(isInternalLayerViolation(edge('application/a.ts', 'infrastructure/b.ts'))).toBe(false);
      expect(isInternalLayerViolation(edge('infrastructure/a.ts', 'domain/b.ts'))).toBe(false);
      expect(isInternalLayerViolation(edge('floor-plan-home/a.ts', 'application/b.ts'))).toBe(false);
      expect(isInternalLayerViolation(edge('floor-plan-home/a.ts', 'domain/b.ts'))).toBe(false);
      expect(isInternalLayerViolation(edge('floor-plan-home/a.ts', 'infrastructure/b.ts'))).toBe(true);
      expect(isInternalLayerViolation(edge('domain/a.ts', 'application/b.ts'))).toBe(true);
      expect(isInternalLayerViolation(edge('infrastructure/a.ts', 'application/b.ts'))).toBe(true);
      expect(isInternalLayerViolation(edge('application/a.ts', 'services/b.ts'))).toBe(true);
      expect(isInternalLayerViolation(edge('domain/a.ts', 'floor-plan-home/b.ts'))).toBe(true);
    });

    it('scans every plugin library, so a wrong root cannot pass vacuously', () => {
      // Assert
      expect(Object.keys(filesByPlugin)).toEqual(expect.arrayContaining([...EXPECTED_PLUGINS]));
      for (const plugin of EXPECTED_PLUGINS) {
        expect(filesByPlugin[plugin].length, plugin).toBeGreaterThan(0);
      }
      expect(edges.some((edge) => edge.toOwner === CONTRACTS_PLUGIN && edge.fromPlugin !== CONTRACTS_PLUGIN)).toBe(
        true,
      );
      expect(isLayeredPlugin(UI_ROOT, 'klacks-plugin-floor-plan')).toBe(true);
    });
  });

  it('has no plugin import into the host or another plugin (zero tolerance, no allowlist)', () => {
    // Act
    const violations = edges.filter(isBoundaryViolation);

    // Assert
    expect(violations, `${BOUNDARY_RULE}\nForbidden imports:\n${describeEdges(violations)}`).toEqual([]);
  });

  it('keeps the inward layer direction inside layered plugins (zero tolerance)', () => {
    // Act
    const violations = edges.filter(
      (edge) =>
        edge.toOwner === edge.fromPlugin && isLayeredPlugin(UI_ROOT, edge.fromPlugin) && isInternalLayerViolation(edge),
    );

    // Assert
    expect(
      violations,
      'Inside a plugin with domain/application/infrastructure folders, domain imports only domain, infrastructure ' +
        'only domain, application only domain and infrastructure; none of them imports components or services/, and ' +
        'components and services/ reach infrastructure only through application:\n' +
        describeEdges(violations),
    ).toEqual([]);
  });
});
