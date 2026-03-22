// Copyright (c) Heribert Gasparoli Private. All rights reserved.


import { Component,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-error',
  templateUrl: './error.component.html',
  styleUrls: ['./error.component.scss'],
  imports: [FormsModule, TranslateModule, RouterModule],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorComponent {}
