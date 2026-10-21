// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { BaseFilter } from '../base-filter-class';
import { IAbsenceFilter } from './absence-filter.interface';
import { DomainMessages } from 'src/app/domain/constants/messages';

export class AbsenceFilter extends BaseFilter implements IAbsenceFilter {
  language = DomainMessages.DEFAULT_LANG;
}
