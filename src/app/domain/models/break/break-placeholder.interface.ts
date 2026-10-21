// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Client } from '../client/client-class';
import { Absence } from '../absence/absence-class';
import { EntrySource } from '../../enums/entry-source.enum';

export interface IBreakPlaceholder {
  id: string | undefined;
  clientId: string;
  client: Client | undefined;
  from: Date | undefined;
  until: Date | undefined;
  absenceId: string;
  absence: Absence | undefined;
  information: string | undefined;
  entrySource: EntrySource;
}
