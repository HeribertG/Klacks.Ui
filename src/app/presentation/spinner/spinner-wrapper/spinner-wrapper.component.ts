import { Component } from '@angular/core';
import { SpinnerService } from '../spinner.service';
import { CommonModule } from '@angular/common';
import { SpinnerComponent } from '../spinner.component';

@Component({
  selector: 'app-spinner-wrapper',
  templateUrl: './spinner-wrapper.component.html',
  styleUrls: ['./spinner-wrapper.component.scss'],
  standalone: true,
  imports: [CommonModule, SpinnerComponent],
})
export class SpinnerWrapperComponent {
  isInit = false;
  constructor(public spinnerService: SpinnerService) {}
}
