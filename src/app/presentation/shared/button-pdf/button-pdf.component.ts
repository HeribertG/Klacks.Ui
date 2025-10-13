import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { PdfIconComponent } from 'src/app/presentation/icons/pdf-icon.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-button-pdf',
  templateUrl: './button-pdf.component.html',
  styleUrls: ['./button-pdf.component.scss'],
  standalone: true,
  imports: [CommonModule, PdfIconComponent],
})
export class ButtonPdfComponent {
  // @Input() properties
  @Input() buttonDisabled = false;
}
