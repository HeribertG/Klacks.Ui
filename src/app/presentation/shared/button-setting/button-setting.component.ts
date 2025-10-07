import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { OtherGreyComponent } from '../../icons/icon-other-grey.component';

@Component({
  selector: 'app-button-setting',
  templateUrl: './button-setting.component.html',
  styleUrls: ['./button-setting.component.scss'],
  standalone: true,
  imports: [CommonModule, OtherGreyComponent],
})
export class ButtonSettingComponent {
  @Input() buttonDisabled = false;
}
