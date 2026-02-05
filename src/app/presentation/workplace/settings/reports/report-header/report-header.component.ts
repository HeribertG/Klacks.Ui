import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-report-header',
  templateUrl: './report-header.component.html',
  styleUrls: ['./report-header.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule]
})
export class ReportHeaderComponent {
  translate = inject(TranslateService);
}
