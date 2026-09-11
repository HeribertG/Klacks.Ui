// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Build identity of a UI bundle and the token that provides the identity compiled into the running
 * bundle. Without an explicit binding the token yields a development build.
 * @param version - Release version without the leading "v", e.g. 1.0.28
 * @param buildKey - Identity of the build (git SHA of the release commit); "dev" for development builds
 */
import { InjectionToken } from '@angular/core';
import { DEV_BUILD_KEY, DEV_BUILD_VERSION } from 'src/app/domain/constants/build-info.constants';

export interface IBuildInfo {
  version: string;
  buildKey: string;
}

export const BUILD_INFO = new InjectionToken<IBuildInfo>('BUILD_INFO', {
  providedIn: 'root',
  factory: () => ({ version: DEV_BUILD_VERSION, buildKey: DEV_BUILD_KEY }),
});
