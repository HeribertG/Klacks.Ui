// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ObjectError } from './object-error.constants';

export enum lexErrors {
  errUnknownSymbol = ObjectError + 21,
  errUnexpectedEOF = ObjectError + 22,
  errUnexpectedEOL = ObjectError + 23,
}
