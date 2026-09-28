// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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
