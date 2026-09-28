// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Request body for POST Setup/CompleteOwnAdmin. Mirrors the backend's RegistrationResource
 * deliberately as its own interface rather than reusing IAuthentication, which carries fields
 * such as id/isAdmin/modelState that do not exist on this DTO.
 */
export interface SetupOwnAdminRequest {
  appName: string;
  email: string;
  firstName: string;
  lastName: string;
  message: string;
  password: string;
  sendEmail: boolean;
  title: string;
  userName: string;
}
