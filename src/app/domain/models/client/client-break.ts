// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { IBreakPlaceholder } from '../break/break-class';
import { IClientBreak } from './i-client-break';
import { Membership } from './membership';

export class ClientBreak implements IClientBreak {
  id = '';
  idNumber = -1;
  company = '';
  title = '';
  name = '';
  firstName = '';
  secondName = '';
  maidenName = '';
  birthdate = new Date();
  gender = '0';
  legalEntity = false;
  type = 0;

  membership = new Membership();
  breakPlaceholders: IBreakPlaceholder[] = [];
}
