import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { IBreakContext } from 'src/app/domain/models/break-context-class';
import { FallbackPipe } from 'src/app/application/pipes/fallback/fallback.pipe';

@Component({
  selector: 'app-break-context-row',
  standalone: true,
  imports: [FallbackPipe],
  templateUrl: './break-context-row.component.html',
  styleUrls: ['./break-context-row.component.scss'],
})
export class BreakContextRowComponent {
  translate = inject(TranslateService);

  @Input() data!: IBreakContext;
  @Output() editEvent = new EventEmitter<IBreakContext>();
  @Output() isDeleteEvent = new EventEmitter<IBreakContext>();

  onClickEdit(): void {
    this.editEvent.emit(this.data);
  }

  onClickDelete(): void {
    this.isDeleteEvent.emit(this.data);
  }
}
