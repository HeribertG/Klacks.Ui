// schedule-container.component.ts
import { Component } from '@angular/core';
import { ScheduleSectionComponent } from '../schedule-section/schedule-section.component';
import { ShiftSectionComponent } from '../shift-section/shift-section.component';
import { AngularSplitModule } from 'angular-split';
import { CommonModule } from '@angular/common';

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
  public horizontalSize = 206;
  public hScrollbarValue = 0;
  public hScrollbarMaxValue = 0;
  public IsInfoVisible = false;

  onHorizontalSizeChange(newSize: number): void {
    this.horizontalSize = newSize;
  }

  onValueHScrollbarChange(newValue: number): void {
    this.hScrollbarValue = newValue;
  }
  onMaxValueHScrollbarChange(newValue: number): void {
    this.hScrollbarMaxValue = newValue;
  }
}
