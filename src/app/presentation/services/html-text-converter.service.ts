// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Binds the HTML_TEXT_CONVERTER port to the sanitising HTML-to-text conversion in shared/helpers/html-sanitizer.helper.
 * @param html - Rich text HTML from the backend, may already be plain text
 */
import { Injectable } from '@angular/core';
import { IHtmlTextConverter } from 'src/app/domain/interfaces/html-text-converter.interface';
import { htmlToPlainText } from 'src/app/shared/helpers/html-sanitizer.helper';

@Injectable({ providedIn: 'root' })
export class HtmlTextConverterService implements IHtmlTextConverter {
  htmlToPlainText(html: string): string {
    return htmlToPlainText(html);
  }
}
