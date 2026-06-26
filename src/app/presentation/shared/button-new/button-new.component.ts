// Copyright (c) Heribert Gasparoli Private. All rights reserved.


import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-button-new',
  templateUrl: './button-new.component.html',
  styleUrls: ['./button-new.component.scss'],
  standalone: true,
  imports: [],
})
export class ButtonNewComponent {
  readonly id = input<string>();
}
