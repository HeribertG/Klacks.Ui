// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import { IRowHeaderDataProvider } from 'src/app/presentation/shared/grid/row-header/row-header-data-provider.interface';
import { DataManagementBreakPlaceholderService } from 'src/app/domain/services/break/data-management-break-placeholder.service';

@Injectable()
export class GanttRowHeaderDataAdapter implements IRowHeaderDataProvider {
  private dataManagement = inject(DataManagementBreakPlaceholderService);

  getRowCount(): number {
    return this.dataManagement.rows;
  }

  getClientName(index: number): string {
    return this.dataManagement.readClientName(index);
  }

  getTotalCount(): number {
    return this.dataManagement.totalAvailableRows > 0
      ? this.dataManagement.totalAvailableRows
      : this.dataManagement.clients.length;
  }
}
