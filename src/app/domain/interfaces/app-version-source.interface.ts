// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Source of the build identity that is currently deployed, and the token through which the
 * application layer reaches it. Resolves null whenever the deployed identity cannot be determined.
 */
import { InjectionToken } from '@angular/core';
import { IBuildInfo } from './build-info.interface';

export interface IAppVersionSource {
  fetchDeployedBuildInfo(): Promise<IBuildInfo | null>;
}

export const APP_VERSION_SOURCE = new InjectionToken<IAppVersionSource>('IAppVersionSource');
