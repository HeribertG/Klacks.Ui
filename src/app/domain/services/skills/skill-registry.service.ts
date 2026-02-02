import { inject, Injectable, signal } from '@angular/core';
import { catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { DataSkillService } from '../../../infrastructure/api/data-skill.service';
import {
  ISkillDefinition,
  ISkillImplementation,
  SkillCategory
} from './skill.interface';

interface IRegisteredSkill {
  definition: ISkillDefinition;
  implementation?: ISkillImplementation;
}

@Injectable({
  providedIn: 'root',
})
export class SkillRegistryService {
  private dataSkillService = inject(DataSkillService);

  private skills = signal<Map<string, IRegisteredSkill>>(new Map());
  public availableSkills = signal<ISkillDefinition[]>([]);
  public isLoaded = signal<boolean>(false);

  initialize(): void {
    this.dataSkillService
      .getSkills()
      .pipe(
        tap((skills) => {
          const skillMap = new Map<string, IRegisteredSkill>();
          skills.forEach((skill) => {
            skillMap.set(skill.name, { definition: skill });
          });
          this.skills.set(skillMap);
          this.availableSkills.set(skills);
          this.isLoaded.set(true);
        }),
        catchError(() => {
          this.isLoaded.set(true);
          return of([]);
        })
      )
      .subscribe();
  }

  registerImplementation(name: string, implementation: ISkillImplementation): void {
    const skillMap = new Map(this.skills());
    const existing = skillMap.get(name);
    if (existing) {
      skillMap.set(name, { ...existing, implementation });
      this.skills.set(skillMap);
    }
  }

  getSkill(name: string): IRegisteredSkill | undefined {
    return this.skills().get(name);
  }

  getSkillsByCategory(category: SkillCategory): ISkillDefinition[] {
    return this.availableSkills().filter((s) => s.category === category);
  }

  hasLocalImplementation(name: string): boolean {
    const skill = this.skills().get(name);
    return !!skill?.implementation;
  }

  getAllSkillNames(): string[] {
    return Array.from(this.skills().keys());
  }
}
