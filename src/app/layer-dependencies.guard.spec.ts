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
  pendingDecisionMap,
  scanProductionSources,
  zoneOf,
} from './layer-dependencies.testing';
import { PENDING_OWNER_DECISION } from './layer-dependencies-pending-owner-decision.constants';

const APP_ROOT = dirname(fileURLToPath(import.meta.url));
const MIN_EXPECTED_FILES = 1000;
const RULE_FILE = '.claude/rules/frontend-architecture.md';
const REGENERATE_COMMAND = 'npm run layers:allowlist';

const OWNER_QUESTION =
  `${RULE_FILE} contradicts itself: its table lets presentation depend only on application/domain/shared, ` +
  'application and infrastructure only on domain, shared only on domain and domain on nothing, while its prose ' +
  'says "Presentation -> Domain Services -> Infrastructure API-Services". Until the owner decides which reading ' +
  'holds, the edges below stay frozen in PENDING_OWNER_DECISION - the list may only shrink. New code must not add ' +
  'to it: reach infrastructure through a domain service (or a domain port bound in app.port-bindings.ts) instead.';

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

  describe('edges pending an owner decision (shrink-only allowlist)', () => {
    const actual = pendingDecisionMap(edges);

    it('adds no new disputed edge', () => {
      // Act
      const added = Object.entries(actual).flatMap(([file, layers]) =>
        layers
          .filter((layer) => !(PENDING_OWNER_DECISION[file] ?? []).includes(layer))
          .map((layer) => `  ${file} -> ${layer}`),
      );

      // Assert
      expect(added, `${OWNER_QUESTION}\nNew disputed edges:\n${added.join('\n')}`).toEqual([]);
    });

    it('lists no edge that is already gone, so the allowlist only shrinks', () => {
      // Act
      const stale = Object.entries(PENDING_OWNER_DECISION).flatMap(([file, layers]) =>
        layers
          .filter((layer: Layer) => !(actual[file] ?? []).includes(layer))
          .map((layer) => `  ${file} -> ${layer}`),
      );

      // Assert
      expect(
        stale,
        `${OWNER_QUESTION}\nThese entries no longer violate - delete them (or run ${REGENERATE_COMMAND}):\n` +
          stale.join('\n'),
      ).toEqual([]);
    });

    it('keeps the allowlist sorted so a regeneration diff stays readable', () => {
      // Arrange
      const keys = Object.keys(PENDING_OWNER_DECISION);

      // Assert
      expect(keys).toEqual([...keys].sort());
      for (const layers of Object.values(PENDING_OWNER_DECISION)) {
        expect(layers).toEqual([...layers].sort());
      }
    });
  });
});
