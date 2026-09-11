// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { appConfig } from './app.config';
import { BUILD_INFO } from './domain/interfaces/build-info.interface';
import { BUILD_INFO_VALUE } from '../build-info';
import { RELOAD_GUARD_STORAGE } from './domain/interfaces/reload-guard-storage.interface';
import { ReloadGuardStorageService } from './infrastructure/storage/reload-guard-storage.service';

const registrationFor = (token: unknown): unknown =>
  appConfig.providers.find((provider) => (provider as { provide?: unknown }).provide === token);

describe('appConfig', () => {
  it('binds the build identity compiled into the bundle', () => {
    expect(registrationFor(BUILD_INFO)).toEqual({ provide: BUILD_INFO, useValue: BUILD_INFO_VALUE });
  });

  it('binds the reload guard storage to its session storage implementation', () => {
    expect(registrationFor(RELOAD_GUARD_STORAGE)).toEqual({
      provide: RELOAD_GUARD_STORAGE,
      useExisting: ReloadGuardStorageService,
    });
  });
});
