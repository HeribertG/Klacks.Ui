import { AfterViewInit, Component } from '@angular/core';
import { SpinnerService } from '../spinner.service';

@Component({
  selector: 'app-spinner-wrapper',
  templateUrl: './spinner-wrapper.component.html',
  styleUrls: ['./spinner-wrapper.component.scss'],
})
export class SpinnerWrapperComponent implements AfterViewInit {
  isInit = false;
  constructor(public spinnerService: SpinnerService) {}
  ngAfterViewInit(): void {
    this.isInit = true;
  }
}
