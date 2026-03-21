// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { SpinnerService } from '../spinner.service';

import { SpinnerComponent } from '../spinner.component';

@Component({
  selector: 'app-spinner-wrapper',
  templateUrl: './spinner-wrapper.component.html',
  styleUrls: ['./spinner-wrapper.component.scss'],
  standalone: true,
  imports: [SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpinnerWrapperComponent {
  spinnerService = inject(SpinnerService);
}
