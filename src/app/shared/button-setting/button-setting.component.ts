import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { GearGreyComponent } from 'src/app/icons/gear-grey.component';

@Component({
  selector: 'app-button-setting',
  templateUrl: './button-setting.component.html',
  styleUrls: ['./button-setting.component.scss'],
  standalone: true,
  imports: [CommonModule, GearGreyComponent],
})
export class ButtonSettingComponent implements OnInit {
  @Input() buttonDisabled: boolean = false;

  constructor() {}

  ngOnInit(): void {}
}
