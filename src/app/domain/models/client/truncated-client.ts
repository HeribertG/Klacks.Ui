// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { BaseTruncated } from '../general-class';
import { ITruncatedClient } from './i-truncated-client';

export class TruncatedClient extends BaseTruncated implements ITruncatedClient {
  clients = [];
  editor = '';
  lastChange = '';
}
