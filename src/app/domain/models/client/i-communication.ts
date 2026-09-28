// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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
