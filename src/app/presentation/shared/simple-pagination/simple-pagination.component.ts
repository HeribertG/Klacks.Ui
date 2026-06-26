// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  Component, Input,
  ChangeDetectionStrategy,
  input,
  output
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-simple-pagination',
  templateUrl: './simple-pagination.component.html',
  styleUrls: ['./simple-pagination.component.scss'],
  standalone: true,
  imports: [FormsModule, NgbPaginationModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimplePaginationComponent {
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