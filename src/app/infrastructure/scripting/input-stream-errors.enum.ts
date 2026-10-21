// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ObjectError } from './object-error.constants';

export enum inputStreamErrors {
  errGoBackPastStartOfSource = ObjectError + 1,
  errInvalidChar = ObjectError + 2,
  errGoBackNotImplemented = ObjectError + 3,
}
