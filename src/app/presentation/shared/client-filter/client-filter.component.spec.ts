// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Tests for the ClientFilterComponent.
 * Verifies individual sort toggle, header click behavior, and CSS class binding.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClientFilterComponent } from './client-filter.component';
import { IClientTypeFilter } from './client-filter.interface';
import { TranslateModule } from '@ngx-translate/core';
import { provideHttpClient, withXhr } from '@angular/common/http';

function makeFilter(overrides: Partial<IClientTypeFilter> = {}): IClientTypeFilter {
  return {
    orderBy: 'name',
    sortOrder: 'asc',
    individualSort: false,
    showEmployees: true,
    showExtern: true,
    ...overrides,
  };
}

describe('ClientFilterComponent', () => {
  let fixture: ComponentFixture<ClientFilterComponent>;
  let component: ClientFilterComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientFilterComponent, TranslateModule.forRoot()],
      providers: [provideHttpClient(withXhr())],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientFilterComponent);
    component = fixture.componentInstance;
    component.filter = makeFilter();
    fixture.detectChanges();
  });

  it('initializes individualSort from filter input', () => {
    component.filter = makeFilter({ individualSort: true });
    component.ngOnInit();
    expect(component['individualSort']).toBe(true);
  });

  it('toggles individualSort ON and clears orderBy/sortOrder in filter', () => {
    let emitCount = 0;
    component.filterChange.subscribe(() => emitCount++);

    component['onToggleIndividualSort']();

    expect(component['individualSort']).toBe(true);
    expect(component.filter.orderBy).toBe('');
    expect(component.filter.sortOrder).toBe('');
    expect(component.filter.individualSort).toBe(true);
    expect(emitCount).toBe(1);
  });

  it('toggles individualSort OFF and sets individualSort false in filter', () => {
    component['individualSort'] = true;
    component['onToggleIndividualSort']();

    expect(component['individualSort']).toBe(false);
    expect(component.filter.individualSort).toBe(false);
  });

  it('onClickHeader does nothing when individualSort is active', () => {
    component['individualSort'] = true;
    let emitCount = 0;
    component.filterChange.subscribe(() => emitCount++);

    component['onClickHeader']('firstName');

    expect(emitCount).toBe(0);
  });

  it('onClickHeader emits filterChange when individualSort is inactive', () => {
    let emitCount = 0;
    component.filterChange.subscribe(() => emitCount++);

    component['onClickHeader']('firstName');

    expect(emitCount).toBe(1);
  });

  it('sort buttons have sort-disabled class when individualSort is true', () => {
    const individualBtn = fixture.nativeElement.querySelector('#client-filter-individual-button') as HTMLElement;
    individualBtn.click();
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.sort-disabled');
    expect(buttons.length).toBe(4);
  });

  it('individual button has individual-active class when individualSort is true', () => {
    const individualBtn = fixture.nativeElement.querySelector('#client-filter-individual-button') as HTMLElement;
    individualBtn.click();
    fixture.detectChanges();
    expect(individualBtn.classList).toContain('individual-active');
  });
});
