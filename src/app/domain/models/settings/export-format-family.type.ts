// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ExportFormatFamilies } from '../../constants/export-format-families.constants';

export type ExportFormatFamily = (typeof ExportFormatFamilies)[keyof typeof ExportFormatFamilies];
