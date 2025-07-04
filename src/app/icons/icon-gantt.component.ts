import { Component, inject } from '@angular/core';
import { NavIconColorService } from '../services/nav-icon-color.service';

@Component({
  selector: 'app-icon-gantt',
  styleUrls: ['./icon.scss'],
  template: `
    <svg
      width="28px"
      height="28px"
      viewBox="0 0 24 24"
      fill="none"
      [style.color]="currentColor"
    >
      <path
        d="M19.9 13.5H4.1C2.6 13.5 2 14.14 2 15.73V19.77C2 21.36 2.6 22 4.1 22H19.9C21.4 22 22 21.36 22 19.77V15.73C22 14.14 21.4 13.5 19.9 13.5Z"
        fill="currentColor"
      />
      <path
        opacity="0.4"
        d="M12.9 2H4.1C2.6 2 2 2.64 2 4.23V8.27C2 9.86 2.6 10.5 4.1 10.5H12.9C14.4 10.5 15 9.86 15 8.27V4.23C15 2.64 14.4 2 12.9 2Z"
        fill="currentColor"
      />
    </svg>
  `,
  standalone: true,
})
export class IconGanttComponent {
  private navIconColorService = inject(NavIconColorService);

  public currentColor = this.navIconColorService.iconStandartColor;

  public ChangeColor(isSelected = false): void {
    this.currentColor = isSelected
      ? this.navIconColorService.iconSelectionColor
      : this.navIconColorService.iconStandartColor;
  }
}
