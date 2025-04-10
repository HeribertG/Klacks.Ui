import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-all-shift-home',
  templateUrl: './all-shift-home.component.html',
  styleUrl: './all-shift-home.component.scss',
  standalone: false,
})
export class AllShiftHomeComponent {
  @Input() isShift: boolean = false;
  @Output() isChangingEvent = new EventEmitter();
}
