// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { BaseEntity } from '../general-class';
import { IAnnotation } from './i-annotation';

export class Annotation extends BaseEntity implements IAnnotation {
  id = '';
  clientId = '';
  note = '';
}
