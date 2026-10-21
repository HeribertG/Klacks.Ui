// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IBreakPlaceholder } from './break-placeholder.interface';
import { Client } from '../client/client-class';
import { Absence } from '../absence/absence-class';
import { EntrySource } from '../../enums/entry-source.enum';

export class BreakPlaceholder implements IBreakPlaceholder {
  id = undefined;
  clientId = '';
  client: Client | undefined = undefined;
  from: Date | undefined = undefined;
  until: Date | undefined = undefined;
  absenceId = '';
  absence: Absence | undefined = undefined;
  information: string | undefined = undefined;
  entrySource: EntrySource = EntrySource.Placeholder;
}
