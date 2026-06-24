// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Domain service facade for reading the qualification master list.
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

  getQualificationList(): Observable<IQualification[]> {
    return this.dataQualificationService.getQualificationList();
  }
}
