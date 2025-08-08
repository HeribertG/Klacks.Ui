import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ExcelComponent } from 'src/app/presentation/icons/excel.component';

@Component({
  selector: 'app-button-excel',
  templateUrl: './button-excel.component.html',
  styleUrls: ['./button-excel.component.scss'],
  standalone: true,
  imports: [CommonModule, ExcelComponent],
})
export class ButtonExcelComponent {
  // @Input() properties
  @Input() buttonDisabled = false;
}
