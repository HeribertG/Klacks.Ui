// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only


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
