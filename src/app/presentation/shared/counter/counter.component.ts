// Copyright (c) Heribert Gasparoli Private. All rights reserved.


import {
  Component, Input,
  ChangeDetectionStrategy,
  computed,
  inject,
  output
} from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faAngleRight, faAngleLeft } from '@fortawesome/free-solid-svg-icons';
import { DirectionService } from 'src/app/application/services/direction.service';

@Component({
  selector: 'app-counter',
  templateUrl: './counter.component.html',
  styleUrls: ['./counter.component.scss'],
  standalone: true,
  imports: [FontAwesomeModule, FontAwesomeModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CounterComponent {
  private readonly directionService = inject(DirectionService);

  readonly isChanged = output<number>();
  @Input() maxNumber: number | undefined = 99;
  @Input() currentNumber = 1;

  private readonly isRtl = computed(() => this.directionService.direction() === 'rtl');
  public faAngleRight = computed(() => (this.isRtl() ? faAngleLeft : faAngleRight));
  public faAngleLeft = computed(() => (this.isRtl() ? faAngleRight : faAngleLeft));

  onClickPaginationButton(changeValue: number): void {
    let tmpMaxNumber = 99;
    if (this.maxNumber) {
      tmpMaxNumber = this.maxNumber;
    }

    if (changeValue < 0) {
      if (this.currentNumber > 1) {
        this.currentNumber += changeValue;
      }
    } else if (changeValue > 0) {
      if (this.currentNumber < tmpMaxNumber) {
        this.currentNumber += changeValue;
      }
    }
    this.isChanged.emit(this.currentNumber);
  }
}
