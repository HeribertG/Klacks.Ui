import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ISetting } from 'src/app/core/settings-various-class';

@Component({
  selector: 'app-grid-color-row',
  templateUrl: './grid-color-row.component.html',
  styleUrls: ['./grid-color-row.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgbModule],
})
export class GridColorRowComponent {
  @Input() data: ISetting | undefined;
  @Output() isChangingEvent = new EventEmitter<true>();

  public translate = inject(TranslateService);

  onChange(event: Event): void {
    if (this.data && event.target) {
      const inputElement = event.target as HTMLInputElement;
      this.data.value = inputElement.value;
    }
    this.isChangingEvent.emit(true);
  }
}
