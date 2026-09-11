// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { appConfig } from './app.config';
import { BUILD_INFO } from './domain/interfaces/build-info.interface';
import { BUILD_INFO_VALUE } from '../build-info';
import { isDevBuild } from './domain/helpers/build-info.helper';
import { RELOAD_GUARD_STORAGE } from './domain/interfaces/reload-guard-storage.interface';
import { ReloadGuardStorageService } from './infrastructure/storage/reload-guard-storage.service';
import { APP_VERSION_SOURCE } from './domain/interfaces/app-version-source.interface';
import { REALTIME_CONNECTION_STATUS } from './domain/interfaces/realtime-connection-status.interface';
import { DataAppVersionService } from './infrastructure/api/data-app-version.service';
import { SignalRConnectionStatusService } from './infrastructure/signalr/signalr-connection-status.service';

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
});
