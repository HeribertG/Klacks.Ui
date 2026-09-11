// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { appConfig } from './app.config';
import { BUILD_INFO } from './domain/interfaces/build-info.interface';
import { BUILD_INFO_VALUE } from '../build-info';

const registrationFor = (token: unknown): unknown =>
  appConfig.providers.find((provider) => (provider as { provide?: unknown }).provide === token);

describe('appConfig', () => {
  it('binds the build identity compiled into the bundle', () => {
    expect(registrationFor(BUILD_INFO)).toEqual({ provide: BUILD_INFO, useValue: BUILD_INFO_VALUE });
  });
});
