import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-counter',
  templateUrl: './counter.component.html',
  styleUrls: ['./counter.component.scss'],
})
export class CounterComponent implements OnInit {
  @Output() isChanged = new EventEmitter<number>();
  @Input() maxNumber: number | undefined = 99;
  @Input() currentNumber: number = 1;

  constructor() {}

  ngOnInit(): void {}

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
