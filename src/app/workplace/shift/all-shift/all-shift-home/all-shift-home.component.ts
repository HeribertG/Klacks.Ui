import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AllShiftListComponent } from '../all-shift-list/all-shift-list.component';
import { AllShiftNavComponent } from '../all-shift-nav/all-shift-nav.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-all-shift-home',
  templateUrl: './all-shift-home.component.html',
  styleUrl: './all-shift-home.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    AllShiftListComponent,
    AllShiftNavComponent,
  ],
})
export class AllShiftHomeComponent {
  @Input() isShift: boolean = false;
  @Output() isChangingEvent = new EventEmitter();
}
