import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'app-chips',
    templateUrl: './chips.component.html',
    styleUrls: ['./chips.component.scss'],
    standalone: false
})
export class ChipsComponent {
  @Output() delete = new EventEmitter<string>();
  @Input() name = '';
  @Input() key = '';

  onDelete() {
    this.delete.emit(this.key);
  }
}
