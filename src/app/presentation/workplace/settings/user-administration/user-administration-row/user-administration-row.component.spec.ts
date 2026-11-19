// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { UserAdministrationRowComponent } from './user-administration-row.component';
import { RightsChangeEvent } from './rights-change-event.interface';
import { IAuthentication } from 'src/app/domain/models/authentication.interface';
import { USER_RIGHTS_LEVEL } from 'src/app/domain/constants/user-rights-level.constants';

describe('UserAdministrationRowComponent', () => {
  let fixture: ComponentFixture<UserAdministrationRowComponent>;
  let events: RightsChangeEvent[];

  const accountOf = (isAdmin: boolean, isAuthorised: boolean): IAuthentication =>
    ({ id: 'u1', firstName: 'A', lastName: 'B', userName: 'ab', email: 'a@b.c', isAdmin, isAuthorised }) as IAuthentication;

  const select = (): HTMLSelectElement =>
    fixture.nativeElement.querySelector('#user-admin-row-rights-u1') as HTMLSelectElement;

  const render = async (user: IAuthentication, enabled = true): Promise<void> => {
    fixture.componentRef.setInput('user', user);
    fixture.componentRef.setInput('enabled', enabled);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const choose = async (value: string): Promise<void> => {
    const element = select();
    element.value = value;
    element.dispatchEvent(new Event('change'));
    element.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserAdministrationRowComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(UserAdministrationRowComponent);
    events = [];
    fixture.componentInstance.isRightsChangeEvent.subscribe((e) => events.push(e));
  });

  it('renders a single rights select with three choices and none for the old selects', async () => {
    await render(accountOf(false, false));

    expect(select().options.length).toBe(3);
    expect(Array.from(select().options).map((o) => o.value)).toEqual([
      USER_RIGHTS_LEVEL.Planner,
      USER_RIGHTS_LEVEL.Supervisor,
      USER_RIGHTS_LEVEL.Admin,
    ]);
    expect(fixture.nativeElement.querySelector('#user-admin-row-authorised-u1')).toBeNull();
    expect(fixture.nativeElement.querySelector('#user-admin-row-admin-u1')).toBeNull();
  });

  it('shows a planner for an account without roles', async () => {
    await render(accountOf(false, false));
    expect(select().value).toBe(USER_RIGHTS_LEVEL.Planner);
  });

  it('shows a supervisor for Authorised only', async () => {
    await render(accountOf(false, true));
    expect(select().value).toBe(USER_RIGHTS_LEVEL.Supervisor);
  });

  it('shows Admin for an account with both roles', async () => {
    await render(accountOf(true, true));
    expect(select().value).toBe(USER_RIGHTS_LEVEL.Admin);
  });

  it('does not emit while the account is only rendered', async () => {
    await render(accountOf(true, true));
    expect(events).toEqual([]);
  });

  it('emits the chosen level for the account', async () => {
    const user = accountOf(false, true);
    await render(user);

    await choose(USER_RIGHTS_LEVEL.Admin);

    expect(events).toEqual([{ account: user, level: USER_RIGHTS_LEVEL.Admin }]);
  });

  it('reverts to the stored level when the server state comes back unchanged', async () => {
    await render(accountOf(true, false));
    await choose(USER_RIGHTS_LEVEL.Planner);
    expect(events.length).toBe(1);

    await render(accountOf(true, false));

    expect(select().value).toBe(USER_RIGHTS_LEVEL.Admin);
    expect(events.length).toBe(1);
  });

  it('renders a disabled select showing the level for the signed-in account', async () => {
    await render(accountOf(true, false), false);

    expect(select().disabled).toBe(true);
    expect(select().selectedOptions[0].index).toBe(2);
  });
});
