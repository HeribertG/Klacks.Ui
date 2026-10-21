// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Domain service facade for reading and maintaining the qualification master list.
 * Wraps DataQualificationService so presentation components do not depend on infrastructure.
 */
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IQualification } from 'src/app/domain/models/settings/qualification';
import { DataQualificationService } from 'src/app/infrastructure/api/settings/data-qualification.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementQualificationService {
  private dataQualificationService = inject(DataQualificationService);

  getQualificationList(activeIndustriesOnly = false): Observable<IQualification[]> {
    return this.dataQualificationService.getQualificationList(activeIndustriesOnly);
  }

  addQualification(qualification: IQualification): Observable<IQualification> {
    return this.dataQualificationService.addQualification(qualification);
  }

  updateQualification(qualification: IQualification): Observable<IQualification> {
    return this.dataQualificationService.updateQualification(qualification);
  }

  deleteQualification(id: string): Observable<void> {
    return this.dataQualificationService.deleteQualification(id);
  }
}
