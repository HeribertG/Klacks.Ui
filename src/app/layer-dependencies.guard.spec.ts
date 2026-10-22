// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  extractModuleSpecifiers,
  ILayerEdge,
  isDomainCore,
  isProductionSource,
  isZeroToleranceViolation,
  Layer,
  legacyViolationMap,
  scanProductionSources,
  zoneOf,
} from './layer-dependencies.testing';
import { LEGACY_LAYER_VIOLATIONS } from './layer-dependencies-legacy-violations.constants';

const APP_ROOT = dirname(fileURLToPath(import.meta.url));
const MIN_EXPECTED_FILES = 1000;
const RULE_FILE = '.claude/rules/frontend-architecture.md of the super-repo';
const REGENERATE_COMMAND = 'npm run layers:allowlist';

const LEGACY_RULE =
  `The layer rule (${RULE_FILE}) lets domain/services and application import infrastructure/api, ` +
  'infrastructure/storage and infrastructure/signalr (owner decision 2026-10-20) and forbids every other layer edge ' +
  'that its table does not list. Existing violations stay frozen in LEGACY_LAYER_VIOLATIONS - the list may only ' +
  'shrink. It is keyed by file and target layer, so it cannot count imports: do not add further imports on a listed ' +
  'edge to a listed file either.';

const ADVICE_BY_TARGET_LAYER: Readonly<Record<Layer, string>> = {
  infrastructure:
    'presentation -> infrastructure: move the logic into a domain service (domain/services) and inject that; do ' +
    'not add pass-through wrappers without own logic. domain/services and application may only use ' +
    'infrastructure/api, storage and signalr; reach other infrastructure folders through a port in ' +
    'domain/interfaces bound in app.port-bindings.ts.',
  shared:
    'only presentation may import shared. Move a pure helper into domain/helpers, or reach DOM/browser code ' +
    'through a port in domain/interfaces bound in app.port-bindings.ts.',
  domain: 'invert the dependency or move the file.',
  application: 'invert the dependency or move the file.',
  presentation: 'invert the dependency or move the file.',
};

const adviceFor = (layers: readonly Layer[]): string =>
  [...new Set(layers)].map((layer) => `  -> ${layer}: ${ADVICE_BY_TARGET_LAYER[layer]}`).join('\n');

const describeEdges = (edges: readonly ILayerEdge[]): string =>
  edges.map((edge) => `  ${edge.file} -> ${edge.target} ('${edge.specifier}')`).join('\n');

describe('layer dependencies', () => {
  const { files, edges } = scanProductionSources(APP_ROOT);

  describe('scanner', () => {
    it('extracts static, type-only, re-export, side-effect and dynamic imports but no comments or strings', () => {
      // Arrange
      const source = [
        "import type { A } from './a';",
        "export * from '../b';",
        "export { C } from 'src/app/c';",
        "import './side-effect';",
        "const lazy = () => import(\n  './lazy'\n);",
        "// import { Commented } from './commented';",
        "const text = \"import { Text } from './text'\";",
      ].join('\n');

      // Act
      const specifiers = extractModuleSpecifiers(source);

      // Assert
      expect(specifiers).toEqual(['./a', '../b', 'src/app/c', './side-effect', './lazy']);
    });

    it('classifies paths by layer prefix, keeping nested shared folders in their parent layer', () => {
      // Arrange / Act / Assert
      expect(zoneOf('app.config.ts')).toBe('composition-root');
      expect(zoneOf('../environments/environment.ts')).toBe('outside-app');
      expect(zoneOf('presentation/shared/grid/grid.component.ts')).toBe('presentation');
      expect(zoneOf('domain/services/shared/x.service.ts')).toBe('domain');
      expect(zoneOf('Shared/helpers/date.helper.ts')).toBe('shared');
      expect(isDomainCore('domain/models/client/client.ts')).toBe(true);
      expect(isDomainCore('domain/services/client/client-list.service.ts')).toBe(false);
    });

    it('leaves specs and test support files out of the scan', () => {
      // Arrange / Act / Assert
      expect(isProductionSource('domain/services/x.service.spec.ts')).toBe(false);
      expect(isProductionSource('shared/testing/time-zone.testing.ts')).toBe(false);
      expect(isProductionSource('layer-dependencies.testing.ts')).toBe(false);
      expect(isProductionSource('domain/services/x.service.ts')).toBe(true);
    });

    it('scans the whole production tree', () => {
      // Assert
      expect(files.length).toBeGreaterThan(MIN_EXPECTED_FILES);
      expect(edges.length).toBeGreaterThan(files.length);
    });
  });

  it('places every production file either at the composition root or inside one of the five layers', () => {
    // Act
    const misplaced = files.filter((file) => zoneOf(file) === 'unknown');

    // Assert
    expect(misplaced, `Files outside the layer folders:\n${misplaced.join('\n')}`).toEqual([]);
  });

  it('has no edge that every reading of the layer rule forbids (zero tolerance, no allowlist)', () => {
    // Act
    const violations = edges.filter(isZeroToleranceViolation);

    // Assert
    expect(
      violations,
      'Forbidden outward imports (nothing below presentation may import presentation; domain, infrastructure and ' +
        'shared may not import application; the domain core may not import infrastructure; no layer imports the ' +
        'composition root). Invert the dependency with a port in domain/interfaces bound in app.port-bindings.ts, ' +
        `or move the file to the layer it belongs to:\n${describeEdges(violations)}`,
    ).toEqual([]);
  });

  describe('legacy layer violations (shrink-only allowlist)', () => {
    const actual = legacyViolationMap(edges);

    it('adds no new legacy file/layer pair', () => {
      // Act
      const added = Object.entries(actual).flatMap(([file, layers]) =>
        layers.filter((layer) => !(LEGACY_LAYER_VIOLATIONS[file] ?? []).includes(layer)).map((layer) => ({ file, layer })),
      );
      const lines = added.map(({ file, layer }) => `  ${file} -> ${layer}`);

      // Assert
      expect(
        lines,
        `${LEGACY_RULE}\nNew layer violations:\n${lines.join('\n')}\n` +
          `What to do instead:\n${adviceFor(added.map(({ layer }) => layer))}`,
      ).toEqual([]);
    });

    it('lists no edge that is already gone, so the allowlist only shrinks', () => {
      // Act
      const stale = Object.entries(LEGACY_LAYER_VIOLATIONS).flatMap(([file, layers]) =>
        layers
          .filter((layer: Layer) => !(actual[file] ?? []).includes(layer))
          .map((layer) => `  ${file} -> ${layer}`),
      );

      // Assert
      expect(
        stale,
        `These LEGACY_LAYER_VIOLATIONS entries no longer violate - delete them (or run ${REGENERATE_COMMAND}) so ` +
          `the allowlist keeps shrinking:\n${stale.join('\n')}`,
      ).toEqual([]);
    });

    it('keeps the allowlist sorted so a regeneration diff stays readable', () => {
      // Arrange
      const keys = Object.keys(LEGACY_LAYER_VIOLATIONS);

      // Assert
      expect(keys).toEqual([...keys].sort());
      for (const layers of Object.values(LEGACY_LAYER_VIOLATIONS)) {
        expect(layers).toEqual([...layers].sort());
      }
    });
  });
});
