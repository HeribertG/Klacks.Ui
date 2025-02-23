import { Component, Input, OnInit } from '@angular/core';

@Component({
    selector: 'app-button-pdf',
    templateUrl: './button-pdf.component.html',
    styleUrls: ['./button-pdf.component.scss'],
    standalone: false
})
export class ButtonPdfComponent implements OnInit {
  @Input() buttonDisabled = false;

  constructor() { }

  ngOnInit(): void {
  }

}
