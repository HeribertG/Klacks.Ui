import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faAngleRight, faAngleLeft } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-counter',
  templateUrl: './counter.component.html',
  styleUrls: ['./counter.component.scss'],
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, FontAwesomeModule],
})
export class CounterComponent {
  @Output() isChanged = new EventEmitter<number>();
  @Input() maxNumber: number | undefined = 99;
  @Input() currentNumber = 1;

  public faAngleRight = faAngleRight;
  public faAngleLeft = faAngleLeft;

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
