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
