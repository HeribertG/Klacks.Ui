// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Converts stored rich text HTML into plain text for domain services that cannot parse HTML themselves (the DOM
 * parser and the sanitiser live outside the domain), and the token through which it is provided.
 * @param htmlToPlainText - Returns the plain text of the given HTML with one line per block element
 */
import { InjectionToken } from '@angular/core';

export interface IHtmlTextConverter {
  htmlToPlainText(html: string): string;
}

export const HTML_TEXT_CONVERTER = new InjectionToken<IHtmlTextConverter>('IHtmlTextConverter');
