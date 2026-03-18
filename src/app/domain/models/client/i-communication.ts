// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface ICommunication {
  prefix: string;
  isPhone: boolean;
  isEmail: boolean;
  id: string | undefined;
  clientId: string | undefined;
  type: number;
  value: string;
  index: number;
}
