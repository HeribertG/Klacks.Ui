// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Horizontal scrollbar wrapper delegating to the generic ScrollbarComponent.
 * @param value - Current scroll position in ticks
 * @param maxValue - Total number of ticks in the scrollable range
 * @param visibleValue - Number of ticks visible without scrolling
 */
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ChangeDetectionStrategy,
  input
} from '@angular/core';
import {
  ScrollbarComponent,
  IImagesThumps,
  ImagesThumps,
} from '../scrollbar/scrollbar.component';

@Component({
  selector: 'app-h-scrollbar',
  template: `<app-scrollbar
    [orientation]="'horizontal'"
    [value]="value"
    [maxValue]="maxValue()"
    [visibleValue]="visibleValue()"
    (valueChange)="onValueChange($event)"
    (maxValueChange)="maxValueChange.emit($event)"
  ></app-scrollbar>`,
  styles: [':host { display: block; height: 100%; width: 100%; } app-scrollbar { display: block; height: 100%; width: 100%; }'],
  standalone: true,
  imports: [ScrollbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HScrollbarComponent {
  readonly maxValue = input(365);
  readonly visibleValue = input(180);
  @Input() value = 0;
  @Output() valueChange = new EventEmitter<number>();
  @Output() maxValueChange = new EventEmitter<number>();

  @ViewChild(ScrollbarComponent) scrollbar!: ScrollbarComponent;

  onValueChange(newValue: number) {
    this.value = newValue;
    this.valueChange.emit(newValue);
  }

  refresh(): void {
    this.scrollbar?.refresh();
  }
}

export { IImagesThumps, ImagesThumps };
