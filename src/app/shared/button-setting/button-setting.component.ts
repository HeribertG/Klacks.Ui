import { Component, Input, OnInit } from '@angular/core';

@Component({
    selector: 'app-button-setting',
    templateUrl: './button-setting.component.html',
    styleUrls: ['./button-setting.component.scss'],
    standalone: false
})
export class ButtonSettingComponent implements OnInit {

  @Input() buttonDisabled: boolean = false;
  
  constructor() { }

  ngOnInit(): void {
  }

}
