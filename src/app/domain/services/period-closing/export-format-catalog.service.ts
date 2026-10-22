// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Reads the export format list and sorts it into the choices the export screens offer, each with its translation key.
 * Order formats are the enabled formats of the order family; employee formats are the fixed formats followed by the
 * enabled payroll formats; payrollFormatKeys tells which employee formats are payroll formats.
 * Errors of the read propagate to the caller.
 */

import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ExportFormatFamilies } from 'src/app/domain/constants/export-format-families.constants';
import { FORMAT_LABEL_PREFIX } from 'src/app/domain/constants/export-format-label.constants';
import { ExportFormat } from 'src/app/domain/models/period-closing/export-format';
import { ExportFormatCatalog } from 'src/app/domain/models/period-closing/export-format-catalog';
import { ExportFormatOption } from 'src/app/domain/models/period-closing/export-format-option';
import { ExportFormatResource } from 'src/app/domain/models/settings/export-format-resource.interface';
import { DataExportFormatsService } from 'src/app/infrastructure/api/period-closing/data-export-formats.service';

@Injectable({ providedIn: 'root' })
export class ExportFormatCatalogService {
  private dataExportFormatsService = inject(DataExportFormatsService);

  loadCatalog(): Observable<ExportFormatCatalog> {
    return this.dataExportFormatsService.getFormats().pipe(map((list) => this.toCatalog(list)));
  }

  private toCatalog(list: ExportFormatResource[]): ExportFormatCatalog {
    const order = list.filter((f) => f.enabled && f.family === ExportFormatFamilies.Order);
    const generic = list.filter((f) => f.fixed);
    const payroll = list.filter((f) => f.enabled && f.family === ExportFormatFamilies.Payroll);

    return {
      orderFormats: order.map((f) => this.toOption(f)),
      employeeFormats: [...generic, ...payroll].map((f) => this.toOption(f)),
      payrollFormatKeys: new Set(payroll.map((f) => f.key)),
    };
  }

  private toOption(format: ExportFormatResource): ExportFormatOption {
    return {
      key: format.key as ExportFormat,
      labelKey: `${FORMAT_LABEL_PREFIX}${format.key}`,
    };
  }
}
