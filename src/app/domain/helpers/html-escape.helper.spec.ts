// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { escapeHtml } from './html-escape.helper';

describe('escapeHtml', () => {
  it('escapes every character that could open markup or leave an attribute', () => {
    // Act
    const escaped = escapeHtml(`<script>alert("x")</script> & 'y'`);

    // Assert
    expect(escaped).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;');
  });

  it('renders as the original text when parsed as HTML', () => {
    // Arrange
    const text = `<img src=x onerror=alert(1)> "a" & 'b'`;
    const host = document.createElement('div');

    // Act
    host.innerHTML = `<span title="${escapeHtml(text)}">${escapeHtml(text)}</span>`;

    // Assert
    expect(host.querySelector('img')).toBeNull();
    expect(host.textContent).toBe(text);
    expect(host.querySelector('span')?.getAttribute('title')).toBe(text);
  });

  it('leaves plain text unchanged', () => {
    expect(escapeHtml('OpenStreetMap contributors')).toBe('OpenStreetMap contributors');
  });
});
