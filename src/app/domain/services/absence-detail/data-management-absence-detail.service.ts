// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { AbsenceDetail, IAbsenceDetail } from 'src/app/domain/models/absence-detail/absence-detail-class';
import { DataAbsenceDetailService } from 'src/app/infrastructure/api/absence-detail/data-absence-detail.service';
import { resetSignalAfterDelay } from 'src/app/shared/helpers/signal-pulse.helper';

@Injectable({
  providedIn: 'root',
})
export class DataManagementAbsenceDetailService {
  private dataAbsenceDetailService = inject(DataAbsenceDetailService);

  private _showProgressSpinner = signal(false);
  get showProgressSpinner(): boolean {
    return this._showProgressSpinner();
  }

  public isRead = signal(false);
  public absenceDetails = signal<IAbsenceDetail[]>([]);

  private fireIsReadEvent(): void {
    this.isRead.set(true);
    resetSignalAfterDelay(this.isRead);
  }

  async readAbsenceDetails(): Promise<IAbsenceDetail[]> {
    this._showProgressSpinner.set(true);

    try {
      const result = await lastValueFrom(this.dataAbsenceDetailService.readAbsenceDetailList());
      this.absenceDetails.set(result || []);
      this.fireIsReadEvent();
      return this.absenceDetails();
    } catch (error) {
      console.error('Error loading absence details:', error);
      return [];
    } finally {
      this._showProgressSpinner.set(false);
    }
  }

  async addAbsenceDetail(item: AbsenceDetail): Promise<IAbsenceDetail | null> {
    this._showProgressSpinner.set(true);

    try {
      const result = await lastValueFrom(this.dataAbsenceDetailService.addAbsenceDetail(item));
      await this.readAbsenceDetails();
      return result;
    } catch (error) {
      console.error('Error adding absence detail:', error);
      return null;
    } finally {
      this._showProgressSpinner.set(false);
    }
  }

  async updateAbsenceDetail(item: IAbsenceDetail): Promise<IAbsenceDetail | null> {
    this._showProgressSpinner.set(true);

    try {
      const result = await lastValueFrom(this.dataAbsenceDetailService.updateAbsenceDetail(item));
      await this.readAbsenceDetails();
      return result;
    } catch (error) {
      console.error('Error updating absence detail:', error);
      return null;
    } finally {
      this._showProgressSpinner.set(false);
    }
  }

  async deleteAbsenceDetail(id: string): Promise<boolean> {
    this._showProgressSpinner.set(true);

    try {
      await lastValueFrom(this.dataAbsenceDetailService.deleteAbsenceDetail(id));
      await this.readAbsenceDetails();
      return true;
    } catch (error) {
      console.error('Error deleting absence detail:', error);
      return false;
    } finally {
      this._showProgressSpinner.set(false);
    }
  }
}
