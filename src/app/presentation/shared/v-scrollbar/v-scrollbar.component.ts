// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Vertical scrollbar wrapper delegating to the generic ScrollbarComponent.
 * @param value - Current scroll position in ticks
 * @param maxValue - Total number of ticks in the scrollable range
 * @param visibleValue - Number of ticks visible without scrolling
 */
import {
  Component,
  Input,
  ChangeDetectionStrategy,
  input,
  output,
  viewChild
} from '@angular/core';
import {
  ScrollbarComponent,
  IImagesThumps,
  ImagesThumps,
} from '../scrollbar/scrollbar.component';

@Component({
  selector: 'app-v-scrollbar',
  template: `<app-scrollbar
    [orientation]="'vertical'"
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
export class VScrollbarComponent {
  readonly maxValue = input(365);
  readonly visibleValue = input(180);
  @Input() value = 0;
  readonly valueChange = output<number>();
  readonly maxValueChange = output<number>();

  readonly scrollbar = viewChild.required(ScrollbarComponent);

  onValueChange(newValue: number) {
    this.value = newValue;
    this.valueChange.emit(newValue);
  }

  refresh(): void {
    this.scrollbar()?.refresh();
  }
}

export { IImagesThumps, ImagesThumps };
