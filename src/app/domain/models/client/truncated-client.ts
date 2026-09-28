// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { BaseTruncated } from '../general-class';
import { ITruncatedClient } from './i-truncated-client';

export class TruncatedClient extends BaseTruncated implements ITruncatedClient {
  clients = [];
  editor = '';
  lastChange = '';
}
