// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, computed, inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { SpinnerService } from '../spinner.service';
import { BackendAvailabilityService } from 'src/app/application/services/backend-availability.service';

import { SpinnerComponent } from '../spinner.component';

@Component({
  selector: 'app-spinner-wrapper',
  templateUrl: './spinner-wrapper.component.html',
  styleUrl: './spinner-wrapper.component.scss',
  standalone: true,
  imports: [SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpinnerWrapperComponent {
  spinnerService = inject(SpinnerService);
  private readonly backendAvailability = inject(BackendAvailabilityService);

  readonly showSpinner = computed(
    () => this.spinnerService.showSpinner() && !this.backendAvailability.isOutageSuspected()
  );
}
