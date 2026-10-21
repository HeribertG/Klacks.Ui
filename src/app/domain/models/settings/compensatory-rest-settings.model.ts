// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ICompensatoryRestSettings } from './compensatory-rest-settings.interface';

export class CompensatoryRestSettings implements ICompensatoryRestSettings {
  compensatoryRestEnabled = false;
  compensatoryRestDeadlineDays = 0;
}
