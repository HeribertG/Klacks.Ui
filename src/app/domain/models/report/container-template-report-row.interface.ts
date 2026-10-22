// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-item.interface';

export interface ContainerTemplateReportRow extends IContainerTemplateItem {
  weekday: number;
  templateFromTime: string;
  templateUntilTime: string;
  startShift?: string;
  endShift?: string;
}
