// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IReceivedEmailListItem } from './received-email-list-item.interface';

export interface IReceivedEmail extends IReceivedEmailListItem {
  bodyHtml: string;
  bodyText: string;
  imapUid: number;
}
