// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IImapServerSettings } from './imap-server-settings.interface';

export class ImapServerSettings implements IImapServerSettings {
  server = '';
  port = '993';
  username = '';
  password = '';
  enableSSL = 'true';
  folder = 'INBOX';
  pollInterval = '300';
}
