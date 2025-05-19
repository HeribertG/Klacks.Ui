import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PdfIconComponent } from 'src/app/icons/pdf-icon.component';

@Component({
  selector: 'app-button-pdf',
  templateUrl: './button-pdf.component.html',
  styleUrls: ['./button-pdf.component.scss'],
  standalone: true,
  imports: [CommonModule, PdfIconComponent],
})
export class ButtonPdfComponent {
  @Input() buttonDisabled = false;
}
