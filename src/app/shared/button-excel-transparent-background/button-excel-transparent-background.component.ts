import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ExcelComponent } from 'src/app/icons/excel.component';

@Component({
  selector: 'app-button-excel-transparent-background',
  templateUrl: './button-excel-transparent-background.component.html',
  styleUrls: ['./button-excel-transparent-background.component.scss'],
  standalone: true,
  imports: [CommonModule, ExcelComponent],
})
export class ButtonExcelTransparentBackgroundComponent {}
