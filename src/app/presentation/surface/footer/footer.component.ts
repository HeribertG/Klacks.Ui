// Copyright (c) Heribert Gasparoli Private. All rights reserved.


import { Component,
  ChangeDetectionStrategy,
} from '@angular/core';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {}
