// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-identity-provider-header',
  templateUrl: './identity-provider-header.component.html',
  styleUrls: ['./identity-provider-header.component.scss'],
  standalone: true,
  imports: [TranslateModule],
})
export class IdentityProviderHeaderComponent {
  public translate = inject(TranslateService);
}
