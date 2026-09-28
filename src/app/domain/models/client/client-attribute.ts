// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { DomainMessages } from 'src/app/domain/constants/messages';
import { IClientAttribute } from './i-client-attribute';

export class ClientAttribute implements IClientAttribute {
  id = undefined;
  type = 0;
  name = DomainMessages.NOT_DEFINED;
}
