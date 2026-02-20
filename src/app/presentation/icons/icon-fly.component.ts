import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { NavIconColorService } from 'src/app/presentation/services/nav-icon-color.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-fly',
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
        <path d="M127.6,76C42.3,124,9.4,142.7,10,142.9c0.4,0.2,16.6,3.5,36,7.3c19.4,3.8,35.6,7.1,36,7.2c0.8,0.2,0.8,2.9,0.9,44.6l0.1,44.4l31.1-27.7c17.1-15.3,31.2-27.7,31.3-27.7c0.1,0,16.1,12.5,35.5,27.8c19.4,15.3,35.3,27.7,35.4,27.6c0.2-0.1,29.7-236.9,29.6-237C246,9.4,192.6,39.4,127.6,76z M215.3,40.4c-0.2,0.3-20,26.9-44.1,58.9c-40.8,54.4-44.7,59.8-58.4,80.4L98,201.9l-0.1-22.2l-0.1-22.2l58.8-58.8c32.4-32.4,58.8-58.8,58.9-58.8C215.5,39.9,215.4,40.2,215.3,40.4z"/>
      </g></g></g>
    </svg>
  `,
  standalone: true,
})
export class IconFlyComponent {
  static getSvg(color: string): string {
    return `
      <svg fill="${color}" height="24px" width="24px" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" xml:space="preserve">
        <g><g><g>
          <path d="M127.6,76C42.3,124,9.4,142.7,10,142.9c0.4,0.2,16.6,3.5,36,7.3c19.4,3.8,35.6,7.1,36,7.2c0.8,0.2,0.8,2.9,0.9,44.6l0.1,44.4l31.1-27.7c17.1-15.3,31.2-27.7,31.3-27.7c0.1,0,16.1,12.5,35.5,27.8c19.4,15.3,35.3,27.7,35.4,27.6c0.2-0.1,29.7-236.9,29.6-237C246,9.4,192.6,39.4,127.6,76z M215.3,40.4c-0.2,0.3-20,26.9-44.1,58.9c-40.8,54.4-44.7,59.8-58.4,80.4L98,201.9l-0.1-22.2l-0.1-22.2l58.8-58.8c32.4-32.4,58.8-58.8,58.9-58.8C215.5,39.9,215.4,40.2,215.3,40.4z"/>
        </g></g></g>
      </svg>`;
  }

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
