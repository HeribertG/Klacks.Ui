// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Binds the domain ports that inner layers inject (domain services, application use cases, shared pipes,
 * infrastructure helpers) to the concrete services of the outer layers. Spread into app.config.ts; specs that build a
 * port consumer spread it into their TestBed providers too, so the port resolves exactly like in the running app and
 * a stub of the concrete service transparently stands in for the port as well.
 */
import { Provider } from '@angular/core';
import { LOCALE_PROVIDER } from './domain/interfaces/locale-provider.interface';
import { PERMISSION_CHECKER } from './domain/interfaces/permission-checker.interface';
import { INTERACTIVE_REPLY_NOTIFIER } from './domain/interfaces/interactive-reply-notifier.interface';
import { THEME_SOURCE } from './domain/interfaces/theme-source.interface';
import { SCRIPT_COMPILER } from './domain/models/automation/rules/script-compiler.interface';
import { BLOB_FILE_OPENER } from './domain/interfaces/blob-file-opener.interface';
import { HTML_TEXT_CONVERTER } from './domain/interfaces/html-text-converter.interface';
import { LocaleService } from './application/services/locale.service';
import { AuthorizationService } from './application/services/authorization.service';
import { ToastShowService } from './presentation/toast/toast-show.service';
import { ThemeService } from './presentation/services/theme.service';
import { ScriptService } from './infrastructure/scripting/script.service';
import { BlobFileOpenerService } from './presentation/services/blob-file-opener.service';
import { HtmlTextConverterService } from './presentation/services/html-text-converter.service';

export const APP_PORT_BINDINGS: Provider[] = [
  { provide: LOCALE_PROVIDER, useExisting: LocaleService },
  { provide: PERMISSION_CHECKER, useExisting: AuthorizationService },
  { provide: INTERACTIVE_REPLY_NOTIFIER, useExisting: ToastShowService },
  { provide: THEME_SOURCE, useExisting: ThemeService },
  { provide: SCRIPT_COMPILER, useExisting: ScriptService },
  { provide: BLOB_FILE_OPENER, useExisting: BlobFileOpenerService },
  { provide: HTML_TEXT_CONVERTER, useExisting: HtmlTextConverterService },
];
