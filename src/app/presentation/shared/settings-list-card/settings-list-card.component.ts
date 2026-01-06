import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-settings-list-card',
  templateUrl: './settings-list-card.component.html',
  styleUrls: ['./settings-list-card.component.scss'],
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsListCardComponent {
  @Input({ required: true }) headline!: string;
  @Input() addLabel = 'Hinzufügen';
  @Input() showAddButton = true;
  @Input() showHeader = false;
  @Output() addClick = new EventEmitter<void>();

  onAddClick(): void {
    this.addClick.emit();
  }
}
