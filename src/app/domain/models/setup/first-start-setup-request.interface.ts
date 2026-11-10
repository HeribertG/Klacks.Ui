// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Request body for POST Setup/CompleteFirstStart: the own admin account plus the one-time setup code the installer
 * printed (empty when the first start needs none). Mirrors the backend's FirstStartRegistrationResource.
 */
import { SetupOwnAdminRequest } from './setup-own-admin-request.interface';

export interface FirstStartSetupRequest extends SetupOwnAdminRequest {
  setupCode: string;
}
