/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CutShiftListComponent } from '../cut-shift-list/cut-shift-list.component';
import { TranslateModule } from '@ngx-translate/core';
import { UrlParameterService } from 'src/app/services/url-parameter.service';
import { DataManagementShiftCutService } from 'src/app/data/management/data-management-shift-cut.service';
import { WorkplaceStateService } from 'src/app/data/management/workplace-state.service';

@Component({
  selector: 'app-cut-shift-home',
  standalone: true,
  imports: [CommonModule, TranslateModule, CutShiftListComponent],
  templateUrl: './cut-shift-home.component.html',
  styleUrl: './cut-shift-home.component.scss',
})
export class CutShiftHomeComponent implements OnInit {
  @Output() isChangingEvent = new EventEmitter<boolean>();

  private urlParameterService = inject(UrlParameterService);
  private dataManagementShiftCutService = inject(DataManagementShiftCutService);
  private workplaceStateService = inject(WorkplaceStateService);

  ngOnInit(): void {
    // Use new registry approach
    this.workplaceStateService.setActiveManagerByRoute('cut-shift');
    
    if (this.dataManagementShiftCutService.cutShifts.length == 0) {
      const result = this.urlParameterService.parseCurrentUrl(
        '/workplace/cut-shift'
      );
      if (result.isValidRoute && result.hasId && result.id) {
        this.dataManagementShiftCutService.readCutShiftList(result.id);
      }
    }
  }

  onIsChanging(event: any) {
    this.isChangingEvent.emit(event);
  }
}
