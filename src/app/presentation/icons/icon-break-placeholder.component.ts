// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { NavIconColorService } from 'src/app/presentation/services/nav-icon-color.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-break-placeholder',
  styleUrls: ['./icon.scss'],
  template: `
    <svg
      [attr.fill]="currentColor"
      height="24px"
      width="24px"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      xml:space="preserve"
    >
      <g><g><g>
        <path d="M80.7,10.3c-2.7,0.5-7.8,2.6-9.7,4c-6.2,4.2-6.6,5.6-6.6,22.8c0,7.3,0.3,16.4,0.6,20.4c1.7,19.4,3.6,35.9,6.9,59.4c1.6,11.2,2.1,13.9,4.4,21.1l2.6,8.3l51.8,0.1l51.8,0.1l2.2-2.8c4.6-5.8,7.6-11.9,7-14.6c-0.2-0.8-1.3-2.2-3.2-3.6c-8.4-6.6-15.5-7.9-46.2-8.5c-14.3-0.3-35.8,0.3-39.7,1l-1.4,0.3l-0.3-7.4c-0.4-8.5-1.9-26.5-3.3-40.2c-1.2-12.4-1.8-20.7-2.5-35.5c-0.7-17.2-1.7-20.9-6-23.7C86.7,10.1,83.8,9.6,80.7,10.3z"/>
        <path d="M83.5,152.6c0,0.6-0.2,3.5-0.5,6.4c-0.9,10.2-6.5,79.7-6.5,81.6c0,1.6,0.3,2.3,1.7,3.7c1.5,1.5,1.9,1.7,4.6,1.7c3.4,0,5.7-1.1,6.9-3.6c0.6-1.3,1.5-10,4.2-43.9c1.9-23.2,3.5-43.3,3.6-44.6l0.1-2.3h-7.1C83.5,151.5,83.5,151.5,83.5,152.6z"/>
        <path d="M160.5,152.9c0,0.8,1.5,20.9,3.5,44.7c2.6,33.1,3.6,43.7,4.2,44.9c1.1,2.2,3.5,3.4,6.6,3.4c4.6,0,6.5-1.7,6.6-5.9c0-2.3-5.1-67.8-6.5-82.1c-0.2-2.9-0.4-5.5-0.5-5.9c0-0.4-1.7-0.6-7-0.6h-7L160.5,152.9L160.5,152.9z"/>
        <path d="M97.7,203.3c-0.1,1.2-0.4,4.5-0.6,7.5l-0.3,5.4h31.4c29.7,0,31.4-0.1,31.2-0.9c-0.1-0.4-0.3-3.2-0.5-6.1c-0.1-2.9-0.4-5.8-0.5-6.6l-0.3-1.3h-30H98L97.7,203.3z"/>
      </g></g></g>
    </svg>
  `,
  standalone: true,
})
export class IconBreakPlaceholderComponent {
  private navIconColorService = inject(NavIconColorService);
  private cdr = inject(ChangeDetectorRef);

  private isSelected = false;

  get currentColor(): string {
    return this.isSelected
      ? this.navIconColorService.iconSelectionColor
      : this.navIconColorService.iconStandartColor;
  }

  public ChangeColor(isSelected = false): void {
    this.isSelected = isSelected;
    this.cdr.markForCheck();
  }
}
