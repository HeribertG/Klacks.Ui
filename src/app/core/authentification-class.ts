export type IModelState = Record<string, string[]>;

export interface IModelStateDictionary {
  isValid: boolean;
  errors: IModelState;
}

export class ModelState implements IModelState {
  [key: string]: string[];
}

export class ModelStateDictionary implements IModelStateDictionary {
  isValid: boolean;
  errors: ModelState;

  constructor() {
    this.isValid = true;
    this.errors = {};
  }

  addError(key: string, error: string) {
    if (!this.errors[key]) {
      this.errors[key] = [];
    }

    this.errors[key].push(error);
    this.isValid = false;
  }

  getErrors(key: string): string[] {
    return this.errors[key] || [];
  }

  hasErrors(): boolean {
    return !this.isValid;
  }
}

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
}

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
}

export interface IMyToken {
  success: boolean;
  token: string;
  subject: string;
  errorMessage: string;
  expTime: Date;
  username: string;
  firstName: string;
  name: string;
  id: string;
  isAdmin: boolean;
  isAuthorised: boolean;
  refreshToken: string;
  version: string;
}
export class MyToken implements IMyToken {
  success = false;
  token = '';
  subject = '';
  errorMessage = '';
  expTime = new Date();
  username = '';
  firstName = '';
  name = '';
  id = '';
  isAdmin = false;
  isAuthorised = false;
  refreshToken = '';
  version = '';
}

export class ChangePassword {
  userName = '';
  firstName = '';
  lastName = '';
  email = '';
  oldPassword = '';
  password = '';
  token = '';
  message = '';
  title = '';
  appName = '';
}

export class ChangeRole {
  userId = '';
  roleName = '';
  isSelected = false;
}

export interface IResponseAuthentication {
  expires: Date | undefined;
  isAdmin: boolean;
  isAuthorised: boolean;
  success: boolean;
}
export class ResponseAuthentication {
  expires = undefined;
  isAdmin = false;
  isAuthorised = false;
  success = false;
}
