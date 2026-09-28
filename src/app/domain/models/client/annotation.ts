// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { BaseEntity } from '../general-class';
import { IAnnotation } from './i-annotation';

export class Annotation extends BaseEntity implements IAnnotation {
  id = '';
  clientId = '';
  note = '';
}
