// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { AllGroupHomeComponent } from './all-group-home.component';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { PERMISSIONS } from 'src/app/domain/constants/permissions.constants';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';

@Component({ selector: 'app-all-group-list', template: '', standalone: true })
class FakeAllGroupListComponent {}

@Component({ selector: 'app-all-group-nav', template: '', standalone: true })
class FakeAllGroupNavComponent {}

@Component({ selector: 'app-tree-group', template: '', standalone: true })
class FakeTreeGroupComponent {}

describe('AllGroupHomeComponent - group nav visibility', () => {
  let held: Set<string>;
  let fixture: ComponentFixture<AllGroupHomeComponent>;

  const createFixture = (): ComponentFixture<AllGroupHomeComponent> => {
    TestBed.configureTestingModule({
      imports: [AllGroupHomeComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: AuthorizationService,
          useValue: { hasPermission: (permission: string) => held.has(permission) },
        },
        {
          provide: WorkplaceStateService,
          useValue: { isFocusChanged: () => false, nameOfVisibleEntity: () => undefined, setActiveManagerByRoute: vi.fn() },
        },
        { provide: LocalStorageService, useValue: { get: () => null, set: vi.fn() } },
        { provide: SavebarService, useValue: { setSavebarVisibility: vi.fn() } },
        { provide: LayoutService, useValue: { setContainerToNormalSize: vi.fn() } },
        { provide: SearchService, useValue: { setSearchVisibility: vi.fn(), setGroupViewMode: vi.fn() } },
      ],
    });

    TestBed.overrideComponent(AllGroupHomeComponent, {
      set: { imports: [TranslateModule, FakeAllGroupListComponent, FakeAllGroupNavComponent, FakeTreeGroupComponent] },
    });

    const createdFixture = TestBed.createComponent(AllGroupHomeComponent);
    createdFixture.detectChanges();
    return createdFixture;
  };

  beforeEach(() => {
    held = new Set<string>();
  });

  it('hides the group navigation panel for a planer without CanEditGroups', () => {
    fixture = createFixture();

    const navContainer = fixture.nativeElement.querySelector('#all-group-nav-container');
    expect(navContainer).toBeNull();
  });

  it('shows the group navigation panel for a supervisor with CanEditGroups', () => {
    held.add(PERMISSIONS.CanEditGroups);
    fixture = createFixture();

    const navContainer = fixture.nativeElement.querySelector('#all-group-nav-container');
    expect(navContainer).not.toBeNull();
  });
});
