// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TextFormatterService {
  stripFormatting(html: string): string {
    if (!html) {
      return '';
    }

    const parsed = new DOMParser().parseFromString(html, 'text/html');
    return parsed.body.textContent || '';
  }

  textToHtml(text: string): string {
    if (!text) {
      return '';
    }
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return escaped.replace(/\n/g, '<br>');
  }

  isFormatted(text: string): boolean {
    if (!text) {
      return false;
    }
    return /<[a-z][\s\S]*>/i.test(text);
  }
}
