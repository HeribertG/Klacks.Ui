import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class NavIconColorService {
  private readonly root = document.documentElement;
  private readonly style = getComputedStyle(this.root);

  get iconStandartColor(): string {
    return this.style.getPropertyValue('--iconStandartColor').trim();
  }

  get iconSelectionColor(): string {
    return this.style.getPropertyValue('--iconSelectedColor').trim();
  }
}
