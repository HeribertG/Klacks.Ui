// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IModelStateDictionary } from './model-state-dictionary.interface';

export interface IAuthentication {
  mailSuccess: boolean;
  id: string | undefined;
  userName: string | undefined;
  firstName: string | undefined;
  lastName: string | undefined;
  email: string | undefined;
  password: string | undefined;
  sendEmail: boolean;
  isAdmin: boolean;
  isAuthorised: boolean;
  message: string | undefined;
  title: string | undefined;
  appName: string | undefined;
  modelState: IModelStateDictionary | undefined;
  deactivatedAt: string | null | undefined;
  phoneNumber: string | null | undefined;
}
