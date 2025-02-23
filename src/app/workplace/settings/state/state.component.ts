import {
  Component,
  EventEmitter,
  Inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { State } from 'src/app/core/client-class';
import { MultiLanguage } from 'src/app/core/multi-language-class';
import { DataManagementSettingsService } from 'src/app/data/management/data-management-settings.service';
import { DataManagementSwitchboardService } from 'src/app/data/management/data-management-switchboard.service';
import { CreateEntriesEnum } from 'src/app/helpers/enums/client-enum';
import { MessageLibrary } from 'src/app/helpers/string-constants';

@Component({
    selector: 'app-state',
    templateUrl: './state.component.html',
    styleUrls: ['./state.component.scss'],
    standalone: false
})
export class StateComponent implements OnInit {
  @Output() isChangingEvent = new EventEmitter<boolean>();

  constructor(
    public dataManagementSettingsService: DataManagementSettingsService
  ) {}

  ngOnInit(): void {}

  onClickAdd() {
    const c = new State();
    c.name = new MultiLanguage();

    c.isDirty = CreateEntriesEnum.new;
    this.dataManagementSettingsService.statesList.push(c);
    this.onIsChanging(true);
  }

  onClickDelete(index: number) {
    const c = this.dataManagementSettingsService.statesList[index];

    if (c) {
      if (c.isDirty && c.isDirty === CreateEntriesEnum.new) {
        this.dataManagementSettingsService.statesList.splice(index, 1);
      } else {
        c.name!.de = c.name!.de + '--isDeleted';
        c.isDirty = CreateEntriesEnum.delete;
      }
    }

    this.onIsChanging(true);
  }

  onIsChanging(value: any) {
    this.isChangingEvent.emit(value);
  }
}
