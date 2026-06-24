// Copyright (c) Heribert Gasparoli Private. All rights reserved.


import { Component,
  ChangeDetectionStrategy,
} from '@angular/core';

@Component({
  selector: 'app-spinner',
  templateUrl: './spinner.component.html',
  styleUrl: './spinner.component.scss',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpinnerComponent {}
