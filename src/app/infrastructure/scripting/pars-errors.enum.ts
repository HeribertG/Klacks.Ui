// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ObjectError } from './object-error.constants';

export enum parsErrors {
  errMissingClosingParent = ObjectError + 31,
  errUnexpectedSymbol = ObjectError + 32,
  errMissingLeftParent = ObjectError + 33,
  errMissingComma = ObjectError + 34,
  errNoYetImplemented = ObjectError + 35,
  errSyntaxViolation = ObjectError + 36,
  errIdentifierAlreadyExists = ObjectError + 37,
  errWrongNumberOfParams = ObjectError + 38,
  errCannotCallSubInExpression = ObjectError + 39,
}
