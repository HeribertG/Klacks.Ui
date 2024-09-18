import { Component } from '@angular/core';
import {
  HeaderDirection,
  HeaderProperties,
} from 'src/app/core/headerProperties';
import { DataManagementBreakService } from 'src/app/data/management/data-management-break.service';

@Component({
  selector: 'app-absence-gantt-filter',
  templateUrl: './absence-gantt-filter.component.html',
  styleUrls: ['./absence-gantt-filter.component.scss'],
})
export class AbsenceGanttFilterComponent {
  arrowCompany = '';
  arrowFirstName = '';
  arrowName = '↓';

  companyHeader: HeaderProperties = new HeaderProperties();
  firstNameHeader: HeaderProperties = new HeaderProperties();
  nameHeader: HeaderProperties = new HeaderProperties();

  orderBy = 'name';
  sortOrder = 'asc';
  private templateArrowDown = '↓';
  private templateArrowUp = '↑';
  private templateArrowUndefined = ''; //'↕';

  constructor(public dataManagementBreak: DataManagementBreakService) {}

  private setFilter() {
    this.dataManagementBreak.breakFilter.orderBy = this.orderBy;
    this.dataManagementBreak.breakFilter.sortOrder = this.sortOrder;
  }
  private readPage() {
    this.setFilter();
    this.dataManagementBreak.reRead();
  }

  /* #region   header */

  onClickHeader(orderBy: string) {
    let header: HeaderProperties;
    switch (orderBy) {
      case 'firstName':
        header = this.firstNameHeader;
        break;
      case 'company':
        header = this.companyHeader;
        break;
      case 'name':
        header = this.nameHeader;
        break;
      default:
        throw new Error(`Unexpected orderBy value: ${orderBy}`);
    }
    const sortOrder = this.determineSortOrder(header);
    this.sort(orderBy, sortOrder);
    this.readPage();
  }

  private determineSortOrder(header: HeaderProperties): string {
    header.DirectionSwitch();
    if (header.order === HeaderDirection.Down) return 'asc';
    if (header.order === HeaderDirection.Up) return 'desc';
    return '';
  }

  private sort(orderBy: string, sortOrder: string) {
    this.orderBy = orderBy;
    this.sortOrder = sortOrder;
    this.setHeaderArrowToUndefined();
    this.setDirection(sortOrder, this.setPosition(orderBy)!);
    this.setHeaderArrowTemplate();
  }

  private setPosition(orderBy: string): HeaderProperties | undefined {
    if (orderBy === 'firstName') {
      return this.firstNameHeader;
    }

    if (orderBy === 'company') {
      return this.companyHeader;
    }
    if (orderBy === 'name') {
      return this.nameHeader;
    }

    return undefined;
  }

  private setDirection(sortOrder: string, value: HeaderProperties): void {
    if (sortOrder === 'asc') {
      value.order = HeaderDirection.Down;
    }
    if (sortOrder === 'desc') {
      value.order = HeaderDirection.Up;
    }
  }

  private setHeaderArrowTemplate() {
    this.arrowFirstName = this.setHeaderArrowTemplateSub(this.firstNameHeader);
    this.arrowCompany = this.setHeaderArrowTemplateSub(this.companyHeader);
    this.arrowName = this.setHeaderArrowTemplateSub(this.nameHeader);
  }

  private setHeaderArrowTemplateSub(value: HeaderProperties): string {
    switch (value.order) {
      case HeaderDirection.Down:
        return this.templateArrowDown;
      case HeaderDirection.Up:
        return this.templateArrowUp;
      case HeaderDirection.None:
        return this.templateArrowUndefined;
    }
  }

  private setHeaderArrowToUndefined() {
    this.firstNameHeader.order = HeaderDirection.None;
    this.companyHeader.order = HeaderDirection.None;
    this.nameHeader.order = HeaderDirection.None;
  }

  /* #endregion   header */
}
