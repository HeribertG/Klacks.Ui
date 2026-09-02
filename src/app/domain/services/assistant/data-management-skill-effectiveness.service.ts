// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Domain service for the admin "Skill-Wirksamkeit" scorecard (W6.1). Wraps the infrastructure API
 * service so the presentation layer never talks to HTTP directly.
 */
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ISkillEffectivenessResource } from 'src/app/domain/interfaces/skill-effectiveness.interface';
import { DataSkillEffectivenessService } from 'src/app/infrastructure/api/assistant/data-skill-effectiveness.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementSkillEffectivenessService {
  private dataSkillEffectivenessService = inject(DataSkillEffectivenessService);

  getSkillEffectiveness(days?: number): Observable<ISkillEffectivenessResource> {
    return this.dataSkillEffectivenessService.getSkillEffectiveness(days);
  }
}
