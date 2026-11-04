// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-item.interface';

export interface ItemInvoiceSource {
  isInvoiced(item: IContainerTemplateItem): boolean;
  setInvoiced(item: IContainerTemplateItem, toInvoice: boolean): void;
}
