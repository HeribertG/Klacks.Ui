// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy,
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
  @Input() collectionSize = 0;
  @Input() page = 1;
  @Input() pageSize = 1;
  @Input() maxSize = 5;
  @Input() rotate = true;
  @Input() ellipses = false;
  @Input() boundaryLinks = true;
  @Input() showSummary = true;
  @Input() summaryLabel = 'pagination.sum';

  @Output() pageChange = new EventEmitter<number>();

  onPageChange(event: number): void {
    this.page = event;
    this.pageChange.emit(event);
  }
}