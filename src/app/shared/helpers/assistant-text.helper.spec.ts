// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { formatMessage } from './assistant-text.helper';

describe('formatMessage inline code', () => {
  it('keeps asterisks inside a code span literal (hourly cron expression)', () => {
    expect(formatMessage('Der Import läuft stündlich (`0 * * * *`, Europe/Zurich).')).toBe(
      'Der Import läuft stündlich (<code>0 * * * *</code>, Europe/Zurich).'
    );
  });

  it('keeps a step cron expression literal', () => {
    expect(formatMessage('Alle 15 Minuten: `*/15 * * * *`')).toBe('Alle 15 Minuten: <code>*/15 * * * *</code>');
  });

  it('still renders emphasis and bold outside of code spans', () => {
    expect(formatMessage('Das ist *wichtig* und **fett**, Cron `0 * * * *` bleibt.')).toBe(
      'Das ist <em>wichtig</em> und <strong>fett</strong>, Cron <code>0 * * * *</code> bleibt.'
    );
  });

  it('does not turn emphasis markers inside code into tags when the same line also has emphasis', () => {
    expect(formatMessage('*Zeitplan*: `0 * * * *` und `5 * * * *`')).toBe(
      '<em>Zeitplan</em>: <code>0 * * * *</code> und <code>5 * * * *</code>'
    );
  });

  it('does not create links or bold inside code spans', () => {
    expect(formatMessage('Pfad `**/[a](https://x.example)`')).toBe('Pfad <code>**/[a](https://x.example)</code>');
  });

  it('escapes html inside code spans', () => {
    expect(formatMessage('Tag `<b>*</b>`')).toBe('Tag <code>&lt;b&gt;*&lt;/b&gt;</code>');
  });

  it('does not open a code element for an unterminated backtick while streaming', () => {
    const rendered = formatMessage('Cron `0 * * *');

    expect(rendered).not.toContain('<code>');
    expect(rendered.startsWith('Cron `0')).toBe(true);
  });

  it('renders code spans in list items and table cells', () => {
    expect(formatMessage('- Cron `0 * * * *`')).toBe('<ul><li>Cron <code>0 * * * *</code></li></ul>');
    expect(formatMessage('| a | b |\n| --- | --- |\n| `0 * * * *` | x |')).toBe(
      '<table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td><code>0 * * * *</code></td><td>x</td></tr></tbody></table>'
    );
  });

  it('keeps the Windows folder path without a trailing backslash readable in code', () => {
    expect(formatMessage('Ordner: `C:\\ProgramData\\Klacks\\ErpImport\\erp\\orders`')).toBe(
      'Ordner: <code>C:\\ProgramData\\Klacks\\ErpImport\\erp\\orders</code>'
    );
  });
});
