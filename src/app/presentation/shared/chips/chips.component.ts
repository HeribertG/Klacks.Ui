// Copyright (c) Heribert Gasparoli Private. All rights reserved.


import { Component, EventEmitter, Input, Output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-chips',
  templateUrl: './chips.component.html',
  styleUrls: ['./chips.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    FontAwesomeModule,
    TranslateModule,
    NgbDropdownModule
],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChipsComponent {
  @Output() delete = new EventEmitter<string>();
  @Input() name = '';
  @Input() key = '';

  onDelete() {
    this.delete.emit(this.key);
  }
}
