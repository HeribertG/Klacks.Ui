// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
} from '@angular/core';
import { NavIconColorService } from '../services/nav-icon-color.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-calc',
  styleUrls: ['./icon.scss'],
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
    >
      <rect
        x="7"
        y="4"
        width="10"
        height="4"
        fill="var(--iconStandartColor)"
        opacity="0.3"
      />
      <path
        fill-rule="evenodd"
        fill="var(--iconStandartColor)"
        d="M7,2 L17,2 C18.1045695,2 19,2.8954305 19,4 L19,20 C19,21.1045695 18.1045695,22 17,22
           L7,22 C5.8954305,22 5,21.1045695 5,20 L5,4 C5,2.8954305 5.8954305,2 7,2 Z
           M8,12 C8.55228475,12 9,11.5522847 9,11 C9,10.4477153 8.55228475,10 8,10
           C7.44771525,10 7,10.4477153 7,11 C7,11.5522847 7.44771525,12 8,12 Z
           M8,16 C8.55228475,16 9,15.5522847 9,15 C9,14.4477153 8.55228475,14 8,14
           C7.44771525,14 7,14.4477153 7,15 C7,15.5522847 7.44771525,16 8,16 Z
           M12,12 C12.5522847,12 13,11.5522847 13,11 C13,10.4477153 12.5522847,10 12,10
           C11.4477153,10 11,10.4477153 11,11 C11,11.5522847 11.4477153,12 12,12 Z
           M12,16 C12.5522847,16 13,15.5522847 13,15 C13,14.4477153 12.5522847,14 12,14
           C11.4477153,14 11,14.4477153 11,15 C11,15.5522847 11.4477153,16 12,16 Z
           M16,12 C16.5522847,12 17,11.5522847 17,11 C17,10.4477153 16.5522847,10 16,10
           C15.4477153,10 15,10.4477153 15,11 C15,11.5522847 15.4477153,12 16,12 Z
           M16,16 C16.5522847,16 17,15.5522847 17,15 C17,14.4477153 16.5522847,14 16,14
           C15.4477153,14 15,14.4477153 15,15 C15,15.5522847 15.4477153,16 16,16 Z
           M16,20 C16.5522847,20 17,19.5522847 17,19 C17,18.4477153 16.5522847,18 16,18
           C15.4477153,18 15,18.4477153 15,19 C15,19.5522847 15.4477153,20 16,20 Z
           M8,18 C7.44771525,18 7,18.4477153 7,19 C7,19.5522847 7.44771525,20 8,20 L12,20
           C12.5522847,20 13,19.5522847 13,19 C13,18.4477153 12.5522847,18 12,18 L8,18 Z
           M7,4 L7,8 L17,8 L17,4 L7,4 Z"
      />
    </svg>
  `,
  standalone: true,
})
export class IconCalcComponent {
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
