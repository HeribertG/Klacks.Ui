// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import { IRowHeaderDataProvider } from 'src/app/presentation/shared/grid/row-header/row-header-data-provider.interface';
import { RenderAvailabilityGridService } from './render-availability-grid';

@Injectable()
export class AvailabilityRowHeaderDataAdapter implements IRowHeaderDataProvider {
  private renderGrid = inject(RenderAvailabilityGridService);

  getRowCount(): number {
    return this.renderGrid.getClients().length;
  }

  getClientName(index: number): string {
    const clients = this.renderGrid.getClients();
    return index < clients.length ? clients[index].displayName : '';
  }

  getTotalCount(): number {
    return this.renderGrid.getClients().length;
  }
}
