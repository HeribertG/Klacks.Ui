
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-button-new',
  templateUrl: './button-new.component.html',
  styleUrls: ['./button-new.component.scss'],
  standalone: true,
  imports: [],
})
export class ButtonNewComponent {
  @Input() id?: string;
}
