// shift-section.component.ts
import { Component, Input } from '@angular/core';
import { AngularSplitModule } from 'angular-split';
import { ScheduleShiftRowHeaderComponent } from '../schedule-shift-row-header/schedule-shift-row-header.component';
import { ScheduleShiftSurfaceComponent } from '../schedule-shift-surface/schedule-shift-surface.component';

@Component({
  selector: 'app-shift-section',
  standalone: true,
  imports: [
    AngularSplitModule,
    ScheduleShiftRowHeaderComponent,
    ScheduleShiftSurfaceComponent,
  ],
  templateUrl: './shift-section.component.html',
  styleUrls: ['./shift-section.component.scss'],
})
export class ShiftSectionComponent {
  @Input() horizontalSize!: number;
}
