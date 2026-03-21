// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component,
  ChangeDetectionStrategy,
} from '@angular/core';

import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
  standalone: true,
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainComponent {}
