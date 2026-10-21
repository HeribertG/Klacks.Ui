// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IAddressInfo } from './address-info.interface';

export interface IClientLocationResource {
  id: string;
  type: number;
  currentAddress: IAddressInfo | null;
}
