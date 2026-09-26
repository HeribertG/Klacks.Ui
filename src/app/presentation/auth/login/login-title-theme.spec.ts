// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Guards the login title against the Bootstrap heading colour that ignores the selected theme: the title rule
 * must take its colour from the shared headline token, and that token must stay readable on the login card
 * background in every one of the seven themes.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const COLORS_SCSS = resolve(HERE, '../../../../assets/standard-styles/colors.scss');
const LOGIN_SCSS = resolve(HERE, 'login.component.scss');
const THEME_SELECTORS = [
  ':root {',
  ':root[data-theme="dark"] {',
  ':root[data-theme="high-contrast"] {',
  ':root[data-theme="blue"] {',
  ':root[data-theme="warm"] {',
  ':root[data-theme="oled"] {',
  ':root[data-theme="dimmed"] {',
] as const;
const HEADLINE_TOKEN = '--colorHeadline';
const CARD_TOKEN = '--backgroundColorCard';
const MIN_TEXT_CONTRAST = 4.5;
const HEX_RADIX = 16;
const SRGB_LINEARIZATION_THRESHOLD = 0.03928;
const RELATIVE_LUMINANCE_WEIGHTS = [0.2126, 0.7152, 0.0722] as const;
const CONTRAST_OFFSET = 0.05;

const themeBlock = (css: string, selector: string): string => {
  const start = css.indexOf(`\n${selector}`);
  const end = css.indexOf('\n}', start);
  return css.slice(start, end);
};

const tokenValue = (block: string, token: string): string => {
  const match = block.match(new RegExp(`${token}:([^;]+);`));
  return match ? match[1].trim() : '';
};

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

describe('login title theme colours', () => {
  const colors = readFileSync(COLORS_SCSS, 'utf8').replace(/\r\n/g, '\n');
  const loginScss = readFileSync(LOGIN_SCSS, 'utf8').replace(/\r\n/g, '\n');

  it('takes the title colour from the shared headline token', () => {
    // Arrange
    const rule = loginScss.slice(loginScss.indexOf('.login-title'));

    // Act
    const colorDeclaration = rule.slice(0, rule.indexOf('}')).match(/\bcolor:\s*([^;]+);/);

    // Assert
    expect(colorDeclaration?.[1].trim()).toBe(`var(${HEADLINE_TOKEN})`);
  });

  it.each(THEME_SELECTORS)('defines the headline and card tokens in the %s theme block', (selector) => {
    // Arrange
    const block = themeBlock(colors, selector);

    // Act
    const headline = tokenValue(block, HEADLINE_TOKEN);
    const card = tokenValue(block, CARD_TOKEN);

    // Assert
    expect(headline, `${selector} ${HEADLINE_TOKEN}`).not.toBe('');
    expect(card, `${selector} ${CARD_TOKEN}`).not.toBe('');
  });

  it.each(THEME_SELECTORS)('keeps the title readable on the login card in the %s theme block', (selector) => {
    // Arrange
    const block = themeBlock(colors, selector);

    // Act
    const ratio = contrast(tokenValue(block, HEADLINE_TOKEN), tokenValue(block, CARD_TOKEN));

    // Assert
    expect(ratio).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });
});
