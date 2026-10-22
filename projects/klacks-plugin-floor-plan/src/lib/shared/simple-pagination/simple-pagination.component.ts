// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Plugin-own pagination bar (entry count and ngb-pagination), the floor-plan counterpart of the host simple
 * pagination.
 * @param collectionSize - Total number of entries
 * @param page - Current page (1-based)
 * @param pageSize - Entries per page
 * @param maxSize - Maximum number of page links shown
 * @param showSummary - Shows the entry count label
 * @param summaryLabel - Translation key of the entry count label
 * @param pageChange - Emits the newly selected page
 */

import { Component, Input, ChangeDetectionStrategy, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'lib-simple-pagination',
  templateUrl: './simple-pagination.component.html',
  styleUrls: ['./simple-pagination.component.scss'],
  standalone: true,
  imports: [FormsModule, NgbPaginationModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PluginSimplePaginationComponent {
  readonly collectionSize = input(0);
  @Input() page = 1;
  readonly pageSize = input(1);
  readonly maxSize = input(5);
  readonly rotate = input(true);
  readonly ellipses = input(false);
  readonly boundaryLinks = input(true);
  readonly showSummary = input(true);
  readonly summaryLabel = input('pagination.sum');

  readonly pageChange = output<number>();

  onPageChange(event: number): void {
    this.page = event;
    this.pageChange.emit(event);
  }
}
