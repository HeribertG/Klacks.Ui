import { Component, Input } from '@angular/core';
import { AngularSplitModule } from 'angular-split';
import { CommonModule } from '@angular/common';
import { ScheduleSectionComponent } from '../schedule-section/schedule-section.component';
import { ShiftSectionComponent } from '../shift-section/shift-section.component';

@Component({
  selector: 'app-schedule-container',
  standalone: true,
  imports: [
    CommonModule,
    AngularSplitModule,
    ScheduleSectionComponent,
    ShiftSectionComponent,
  ],
  templateUrl: './schedule-container.component.html',
  styleUrls: ['./schedule-container.component.scss'],
})
export class ScheduleContainerComponent {
  // @Input() properties
  @Input() zoom = 1.0;

  // Public properties (used in templates)
  public horizontalSize = 205;
  public hScrollbarMaxValue = 0;
  public hScrollbarValue = 0;
  public IsInfoVisible = false;

  // Public methods
  onHorizontalSizeChange(newSize: number): void {
    this.horizontalSize = newSize;
  }

  onMaxValueHScrollbarChange(newValue: number): void {
    this.hScrollbarMaxValue = newValue;
  }

  onValueHScrollbarChange(newValue: number): void {
    this.hScrollbarValue = newValue;
  }
}
