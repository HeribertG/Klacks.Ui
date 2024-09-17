import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-button-excel',
  templateUrl: './button-excel.component.html',
  styleUrls: ['./button-excel.component.scss']
})
export class ButtonExcelComponent implements OnInit {
  @Input() buttonDisabled = false;

  constructor() { }

  ngOnInit(): void {
  }

}
