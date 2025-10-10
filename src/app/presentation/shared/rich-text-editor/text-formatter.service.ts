import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TextFormatterService {
  stripFormatting(html: string): string {
    if (!html) {
      return '';
    }

    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  textToHtml(text: string): string {
    if (!text) {
      return '';
    }
    return text.replace(/\n/g, '<br>');
  }

  isFormatted(text: string): boolean {
    if (!text) {
      return false;
    }
    return /<[a-z][\s\S]*>/i.test(text);
  }

  sanitizeHtml(html: string): string {
    if (!html) {
      return '';
    }

    const div = document.createElement('div');
    div.innerHTML = html;

    const allowedTags = ['B', 'I', 'U', 'STRONG', 'EM', 'BR', 'P', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3'];
    const elements = div.querySelectorAll('*');

    elements.forEach((element) => {
      if (!allowedTags.includes(element.tagName)) {
        element.replaceWith(document.createTextNode(element.textContent || ''));
      }
    });

    return div.innerHTML;
  }
}
