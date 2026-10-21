// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Guards the titles of the card pages shown before sign-in (login and own-admin setup) against the Bootstrap
 * heading colour that ignores the selected theme: both pages take the title from the shared auth-card partial,
 * whose title rule must use the shared headline token, and that token must stay readable on the card background
 * in every one of the eight themes. The setup page's inline error and fulfilled-rule texts are held to the same
 * contrast on the card.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const COLOR_THEMES_SCSS = resolve(HERE, '../../../../assets/standard-styles/color-themes.scss');
const AUTH_CARD_SCSS = resolve(HERE, '../_auth-card.scss');
const AUTH_CARD_USE = '@use "../auth-card";';
const AUTH_TITLE_SELECTOR = '.auth-title';
const AUTH_TITLE_HEADING = '<h1 class="auth-title">';
const CARD_PAGES = [
  { name: 'login', scss: resolve(HERE, 'login.component.scss'), html: resolve(HERE, 'login.component.html') },
  {
    name: 'setup',
    scss: resolve(HERE, '../setup/setup.component.scss'),
    html: resolve(HERE, '../setup/setup.component.html'),
  },
] as const;
const SETUP_SCSS = CARD_PAGES[1].scss;
const THEME_SELECTORS = [
  ':root {',
  ':root[data-theme="dark"] {',
  ':root[data-theme="high-contrast"] {',
  ':root[data-theme="blue"] {',
  ':root[data-theme="warm"] {',
  ':root[data-theme="oled"] {',
  ':root[data-theme="dimmed"] {',
  ':root[data-theme="klacks"] {',
] as const;
const HEADLINE_TOKEN = '--colorHeadline';
const CARD_TOKEN = '--backgroundColorCard';
const ERROR_TEXT_TOKEN = '--alertDangerText';
const FULFILLED_TEXT_TOKEN = '--alertSuccessText';
const CARD_TEXT_TOKENS = [HEADLINE_TOKEN, ERROR_TEXT_TOKEN, FULFILLED_TEXT_TOKEN] as const;
const MIN_TEXT_CONTRAST = 4.5;
const HEX_RADIX = 16;
const SRGB_LINEARIZATION_THRESHOLD = 0.03928;
const RELATIVE_LUMINANCE_WEIGHTS = [0.2126, 0.7152, 0.0722] as const;
const CONTRAST_OFFSET = 0.05;

const read = (path: string): string => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

const themeBlock = (css: string, selector: string): string => {
  const start = css.indexOf(`\n${selector}`);
  const end = css.indexOf('\n}', start);
  return css.slice(start, end);
};

const tokenValue = (block: string, token: string): string => {
  const match = block.match(new RegExp(`${token}:([^;]+);`));
  return match ? match[1].trim() : '';
};

const ruleBody = (scss: string, selector: string): string => {
  const rule = scss.slice(scss.indexOf(selector));
  return rule.slice(0, rule.indexOf('}'));
};

const colorOf = (scss: string, selector: string): string | undefined =>
  ruleBody(scss, selector).match(/\bcolor:\s*([^;]+);/)?.[1].trim();

const toRgb = (value: string): [number, number, number] => {
  const named: Record<string, string> = { white: '#ffffff', black: '#000000' };
  const hex = (named[value] ?? value).replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), HEX_RADIX)) as [number, number, number];
};

const luminance = (rgb: [number, number, number]): number =>
  rgb.reduce((sum, channel, index) => {
    const c = channel / 255;
    const linear = c <= SRGB_LINEARIZATION_THRESHOLD ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return sum + linear * RELATIVE_LUMINANCE_WEIGHTS[index];
  }, 0);

const contrast = (a: string, b: string): number => {
  const [light, dark] = [luminance(toRgb(a)), luminance(toRgb(b))].sort((x, y) => y - x);
  return (light + CONTRAST_OFFSET) / (dark + CONTRAST_OFFSET);
};

describe('auth card title theme colours', () => {
  const colors = read(COLOR_THEMES_SCSS);
  const authCardScss = read(AUTH_CARD_SCSS);

  it('takes the title colour from the shared headline token', () => {
    // Arrange
    const selector = AUTH_TITLE_SELECTOR;

    // Act
    const color = colorOf(authCardScss, selector);

    // Assert
    expect(color).toBe(`var(${HEADLINE_TOKEN})`);
  });

  describe.each(CARD_PAGES)('$name page', (page) => {
    it('uses the shared auth-card partial without redefining the title', () => {
      // Arrange
      const scss = read(page.scss);

      // Act
      const usesPartial = scss.includes(AUTH_CARD_USE);
      const redefinesTitle = scss.includes(AUTH_TITLE_SELECTOR);

      // Assert
      expect(usesPartial).toBe(true);
      expect(redefinesTitle).toBe(false);
    });

    it('renders its title as an h1 with the themed title class and no Bootstrap heading class', () => {
      // Arrange
      const html = read(page.html);

      // Act
      const hasThemedHeading = html.includes(AUTH_TITLE_HEADING);
      const hasBootstrapHeading = /class="[^"]*\bh4\b/.test(html);

      // Assert
      expect(hasThemedHeading).toBe(true);
      expect(hasBootstrapHeading).toBe(false);
    });
  });

  it('colours the setup errors and fulfilled password rules with the alert text tokens', () => {
    // Arrange
    const setupScss = read(SETUP_SCSS);

    // Act
    const errorColor = colorOf(setupScss, '.field-error,');
    const fulfilledColor = colorOf(setupScss, '&.met');

    // Assert
    expect(errorColor).toBe(`var(${ERROR_TEXT_TOKEN})`);
    expect(fulfilledColor).toBe(`var(${FULFILLED_TEXT_TOKEN})`);
  });

  it.each(THEME_SELECTORS)('defines the card and its text tokens in the %s theme block', (selector) => {
    // Arrange
    const block = themeBlock(colors, selector);

    // Act
    const values = [CARD_TOKEN, ...CARD_TEXT_TOKENS].map((token) => [token, tokenValue(block, token)]);

    // Assert
    for (const [token, value] of values) {
      expect(value, `${selector} ${token}`).not.toBe('');
    }
  });

  describe.each(CARD_TEXT_TOKENS)('%s', (token) => {
    it.each(THEME_SELECTORS)('stays readable on the card in the %s theme block', (selector) => {
      // Arrange
      const block = themeBlock(colors, selector);

      // Act
      const ratio = contrast(tokenValue(block, token), tokenValue(block, CARD_TOKEN));

      // Assert
      expect(ratio).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    });
  });
});
