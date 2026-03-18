// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ICommunication } from './i-communication';

export class Communication implements ICommunication {
  prefix = '';
  id = '';
  clientId = '';
  type = 0;
  value = '';
  isPhone = false;
  isEmail = false;
  index = 0;
}
