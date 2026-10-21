// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { LocaleDataModule } from './locale-data-module.interface';

export type LocaleDataImport = () => Promise<LocaleDataModule>;

export interface LocaleDataImports {
  data: LocaleDataImport;
  extra: LocaleDataImport;
}
