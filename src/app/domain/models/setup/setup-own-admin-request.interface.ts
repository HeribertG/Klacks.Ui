// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
