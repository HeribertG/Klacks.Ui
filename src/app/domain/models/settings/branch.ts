// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IBranch {
  id: string | undefined;
  name: string;
  address: string;
  phone: string;
  email: string;
  select: boolean;
  isDirty: number;
}

export class Branch implements IBranch {
  id = '';
  name = '';
  address = '';
  phone = '';
  email = '';
  select = false;
  isDirty = 0;
}
