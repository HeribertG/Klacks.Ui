// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IWork } from '../schedule/work.interface';

export interface IContainerSplitResponse {
  firstPart: IWork | null;
  secondPart: IWork | null;
}
