// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IAuthentication } from './authentication.interface';
import { ModelStateDictionary } from './model-state-dictionary-class';

export class Authentication implements IAuthentication {
  id = undefined;
  userName = undefined;
  firstName = undefined;
  lastName = undefined;
  email = undefined;
  password = undefined;
  sendEmail = true;
  isAdmin = false;
  isAuthorised = false;
  message = undefined;
  title = undefined;
  mailSuccess = false;
  appName = undefined;
  modelState: ModelStateDictionary | undefined = undefined;
  deactivatedAt: string | null | undefined = null;
  phoneNumber: string | null | undefined = undefined;
}
