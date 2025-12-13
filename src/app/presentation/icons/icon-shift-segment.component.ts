import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-shift-segment',
  styleUrls: ['./icon.scss'],
  template: `<span [innerHTML]="svgContent"></span>`,
  standalone: true,
})
export class IconShiftSegmentComponent {
  static getSvg(color: string): string {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" opacity="0.3" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke-width="2.5" />
        <path d="M12 12V5" />
        <path d="M12 12H19" />
      </svg>`;
  }

  svgContent: SafeHtml;
  private sanitizer = inject(DomSanitizer);

  constructor() {
    this.svgContent = this.sanitizer.bypassSecurityTrustHtml(
      IconShiftSegmentComponent.getSvg('var(--iconStandartColor)')
    );
  }
}
