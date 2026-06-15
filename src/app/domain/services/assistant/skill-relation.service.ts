// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Domain service for the emergent skill-relationship graph Klacksy has learned.
 * Wraps the infrastructure API service so the presentation layer never talks to HTTP directly.
 */
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DataSkillRelationService } from 'src/app/infrastructure/api/assistant/data-skill-relation.service';
import { ISkillRelation } from 'src/app/domain/models/assistant/skill-relation.interface';

@Injectable({
  providedIn: 'root',
})
export class SkillRelationService {
  private dataSkillRelationService = inject(DataSkillRelationService);

  getAll(): Observable<ISkillRelation[]> {
    return this.dataSkillRelationService.getAll();
  }

  accept(id: string): Observable<ISkillRelation> {
    return this.dataSkillRelationService.accept(id);
  }

  dismiss(id: string): Observable<ISkillRelation> {
    return this.dataSkillRelationService.dismiss(id);
  }
}
