import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Macro } from 'src/app/core/macro-class';
import { DataManagementSettingsService } from 'src/app/data/management/data-management-settings.service';
import { CreateEntriesEnum } from 'src/app/helpers/enums/client-enum';
import { MessageLibrary } from 'src/app/helpers/string-constants';

@Component({
  selector: 'app-macros',
  templateUrl: './macros.component.html',
  styleUrls: ['./macros.component.scss'],
})
export class MacrosComponent implements OnInit {
  @Output() isChangingEvent = new EventEmitter<boolean>();

  constructor(
    public dataManagementSettingsService: DataManagementSettingsService
  ) {}

  ngOnInit(): void {}

  onClickAdd() {
    const c = new Macro();
    c.name = MessageLibrary.NOT_DEFINED;
    c.isDirty = CreateEntriesEnum.new;
    this.dataManagementSettingsService.macroList.push(c);
    this.onIsChanging(true);
  }

  onClickDelete(index: number) {
    const c = this.dataManagementSettingsService.macroList[index];

    if (c) {
      if (c.isDirty && c.isDirty === CreateEntriesEnum.new) {
        this.dataManagementSettingsService.macroList.splice(index, 1);
      } else {
        c.name = c.name + '--isDeleted';
        c.isDirty = CreateEntriesEnum.delete;
      }
    }

    this.onIsChanging(true);
  }

  onIsChanging(event: any) {
    this.isChangingEvent.emit(event);
  }

  private parseName(value: string): string {
    value = value.replace(' ', '_');
    value = value.replace('(', '_');
    value = value.replace(')', '_');
    value = value.replace('=', '_');
    value = value.replace('>', '_');
    value = value.replace('<', '_');
    value = value.replace('/', '_');
    value = value.replace('\\', '_');

    return value;
  }
}
