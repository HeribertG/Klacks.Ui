import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CutShiftListComponent } from '../cut-shift-list/cut-shift-list.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-cut-shift-home',
  standalone: true,
  imports: [CommonModule, TranslateModule, CutShiftListComponent],
  templateUrl: './cut-shift-home.component.html',
  styleUrl: './cut-shift-home.component.scss'
})
export class CutShiftHomeComponent {
  @Input() isCutShift = false;
  @Output() isChangingEvent = new EventEmitter<boolean>();
}
