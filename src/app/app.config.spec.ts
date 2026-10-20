// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ErrorHandler } from '@angular/core';
import { appConfig } from './app.config';
import { AppErrorHandler } from './app.error-handler';
import { BUILD_INFO } from './domain/interfaces/build-info.interface';
import { BUILD_INFO_VALUE } from '../build-info';
import { isDevBuild } from './domain/helpers/build-info.helper';
import { RELOAD_GUARD_STORAGE } from './domain/interfaces/reload-guard-storage.interface';
import { ReloadGuardStorageService } from './infrastructure/storage/reload-guard-storage.service';
import { APP_VERSION_SOURCE } from './domain/interfaces/app-version-source.interface';
import { REALTIME_CONNECTION_STATUS } from './domain/interfaces/realtime-connection-status.interface';
import { DataAppVersionService } from './infrastructure/api/data-app-version.service';
import { SignalRConnectionStatusService } from './infrastructure/signalr/signalr-connection-status.service';
import { APP_PORT_BINDINGS } from './app.port-bindings';
import { LOCALE_PROVIDER } from './domain/interfaces/locale-provider.interface';
import { LocaleService } from './application/services/locale.service';
import { PERMISSION_CHECKER } from './domain/interfaces/permission-checker.interface';
import { AuthorizationService } from './application/services/authorization.service';
import { INTERACTIVE_REPLY_NOTIFIER } from './domain/interfaces/interactive-reply-notifier.interface';
import { ToastShowService } from './presentation/toast/toast-show.service';
import { THEME_SOURCE } from './domain/interfaces/theme-source.interface';
import { ThemeService } from './presentation/services/theme.service';
import { SCRIPT_COMPILER } from './domain/models/automation/rules/script-compiler.interface';
import { ScriptService } from './infrastructure/scripting/script.service';

const registrationFor = (token: unknown): unknown =>
  appConfig.providers.find((provider) => (provider as { provide?: unknown }).provide === token);

describe('appConfig', () => {
  it('binds the build identity compiled into the bundle', () => {
    expect(registrationFor(BUILD_INFO)).toEqual({ provide: BUILD_INFO, useValue: BUILD_INFO_VALUE });
  });

  it('ships a development identity in the committed source', () => {
    expect(isDevBuild(BUILD_INFO_VALUE)).toBe(true);
  });

  it('binds the reload guard storage to its session storage implementation', () => {
    expect(registrationFor(RELOAD_GUARD_STORAGE)).toEqual({
      provide: RELOAD_GUARD_STORAGE,
      useExisting: ReloadGuardStorageService,
    });
  });

  it('binds the deployed-version source to the version.json reader', () => {
    expect(registrationFor(APP_VERSION_SOURCE)).toEqual({
      provide: APP_VERSION_SOURCE,
      useExisting: DataAppVersionService,
    });
  });

  it('binds the realtime connection status to the SignalR adapter', () => {
    expect(registrationFor(REALTIME_CONNECTION_STATUS)).toEqual({
      provide: REALTIME_CONNECTION_STATUS,
      useExisting: SignalRConnectionStatusService,
    });
  });

  it('binds the locale port to the live LocaleService', () => {
    expect(registrationFor(LOCALE_PROVIDER)).toEqual({ provide: LOCALE_PROVIDER, useExisting: LocaleService });
  });

  it('binds the permission port to the AuthorizationService', () => {
    expect(registrationFor(PERMISSION_CHECKER)).toEqual({
      provide: PERMISSION_CHECKER,
      useExisting: AuthorizationService,
    });
  });

  it('binds the interactive reply port to the toast service', () => {
    expect(registrationFor(INTERACTIVE_REPLY_NOTIFIER)).toEqual({
      provide: INTERACTIVE_REPLY_NOTIFIER,
      useExisting: ToastShowService,
    });
  });

  it('binds the theme port to the ThemeService', () => {
    expect(registrationFor(THEME_SOURCE)).toEqual({ provide: THEME_SOURCE, useExisting: ThemeService });
  });

  it('binds the script compiler port to the script interpreter', () => {
    expect(registrationFor(SCRIPT_COMPILER)).toEqual({ provide: SCRIPT_COMPILER, useExisting: ScriptService });
  });

  it('registers every domain port binding', () => {
    for (const binding of APP_PORT_BINDINGS) {
      expect(registrationFor((binding as { provide: unknown }).provide)).toBe(binding);
    }
  });

  it('registers AppErrorHandler as the application ErrorHandler', () => {
    expect(registrationFor(ErrorHandler)).toEqual({ provide: ErrorHandler, useClass: AppErrorHandler });
  });

  it('no longer registers AppErrorHandler under its own class token', () => {
    expect(registrationFor(AppErrorHandler)).toBeUndefined();
  });
});
