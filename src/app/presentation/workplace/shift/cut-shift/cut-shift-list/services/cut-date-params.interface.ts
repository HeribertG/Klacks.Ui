// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { NgbDateStruct, NgbDate } from '@ng-bootstrap/ng-bootstrap';

export interface CutDateParams {
  cutDate: NgbDateStruct | null;
  resetDate: NgbDateStruct | null;
  minDate: NgbDate | undefined;
  maxDate: NgbDate | undefined;
}
