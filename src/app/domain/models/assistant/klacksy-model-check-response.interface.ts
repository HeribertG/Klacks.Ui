// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IKlacksyModelCheckDto } from './klacksy-model-check-dto.interface';

export interface IKlacksyModelCheckResponse {
  models: IKlacksyModelCheckDto[];
  defaultModelId: string | null;
}
