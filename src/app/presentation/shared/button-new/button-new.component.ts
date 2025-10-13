import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-button-new',
  templateUrl: './button-new.component.html',
  styleUrls: ['./button-new.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class ButtonNewComponent {}
