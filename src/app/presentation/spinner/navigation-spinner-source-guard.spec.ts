// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Guards the navigation spinner against moving back into the navigation bar: nav.component.ts must not inject
 * LOADING_INDICATOR_TOKEN and must not listen to router.events, because the component is destroyed when the
 * workplace shell is left, the terminal navigation event is lost with it and the spinner stays on forever.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const NAV_COMPONENT = resolve(HERE, '../surface/nav/nav.component.ts');
const FORBIDDEN_PATTERNS: readonly { pattern: RegExp; description: string }[] = [
  { pattern: /LOADING_INDICATOR_TOKEN/, description: 'injects LOADING_INDICATOR_TOKEN' },
  { pattern: /router\.events/, description: 'listens to router.events' },
];
const CAUSE_MESSAGE =
  'The navigation bar is destroyed when the workplace shell is left (imprint, privacy), so its NavigationEnd ' +
  'event is lost and the global spinner stays on. The navigation spinner belongs in NavigationSpinnerCoordinator.';

describe('navigation spinner source guard', () => {
  const navSource = readFileSync(NAV_COMPONENT, 'utf8').replace(/\r\n/g, '\n');

  FORBIDDEN_PATTERNS.forEach(({ pattern, description }) => {
    it(`nav.component.ts never ${description}`, () => {
      // Arrange
      const matches = navSource.split('\n').filter((line) => pattern.test(line));

      // Act
      const message = matches.length > 0 ? `nav.component.ts ${description}: ${matches.join(' | ')}. ${CAUSE_MESSAGE}` : '';

      // Assert
      expect(message).toBe('');
    });
  });
});
