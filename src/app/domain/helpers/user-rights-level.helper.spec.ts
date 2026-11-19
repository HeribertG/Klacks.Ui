// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { USER_RIGHTS_LEVEL } from 'src/app/domain/constants/user-rights-level.constants';
import { planUserRightsChange, userRightsLevelOf } from './user-rights-level.helper';

describe('user-rights-level.helper', () => {
  describe('userRightsLevelOf', () => {
    it('maps an account without roles to planner', () => {
      expect(userRightsLevelOf({ isAdmin: false, isAuthorised: false })).toBe(USER_RIGHTS_LEVEL.Planner);
    });

    it('maps Authorised only to supervisor', () => {
      expect(userRightsLevelOf({ isAdmin: false, isAuthorised: true })).toBe(USER_RIGHTS_LEVEL.Supervisor);
    });

    it('maps Admin only to admin', () => {
      expect(userRightsLevelOf({ isAdmin: true, isAuthorised: false })).toBe(USER_RIGHTS_LEVEL.Admin);
    });

    it('shows an account with both roles as admin', () => {
      expect(userRightsLevelOf({ isAdmin: true, isAuthorised: true })).toBe(USER_RIGHTS_LEVEL.Admin);
    });
  });

  describe('planUserRightsChange', () => {
    it('plans nothing when the level stays the same', () => {
      expect(planUserRightsChange({ isAdmin: false, isAuthorised: true }, USER_RIGHTS_LEVEL.Supervisor)).toEqual([]);
    });

    it('removes both roles for planner, Admin first', () => {
      expect(planUserRightsChange({ isAdmin: true, isAuthorised: true }, USER_RIGHTS_LEVEL.Planner)).toEqual([
        { roleName: 'Admin', isSelected: false },
        { roleName: 'Authorised', isSelected: false },
      ]);
    });

    it('grants Admin and removes Authorised for admin', () => {
      expect(planUserRightsChange({ isAdmin: false, isAuthorised: true }, USER_RIGHTS_LEVEL.Admin)).toEqual([
        { roleName: 'Admin', isSelected: true },
        { roleName: 'Authorised', isSelected: false },
      ]);
    });

    it('only removes Authorised when an account with both roles is set to admin', () => {
      expect(planUserRightsChange({ isAdmin: true, isAuthorised: true }, USER_RIGHTS_LEVEL.Admin)).toEqual([
        { roleName: 'Authorised', isSelected: false },
      ]);
    });

    it('removes Admin first and then grants Authorised for supervisor', () => {
      expect(planUserRightsChange({ isAdmin: true, isAuthorised: false }, USER_RIGHTS_LEVEL.Supervisor)).toEqual([
        { roleName: 'Admin', isSelected: false },
        { roleName: 'Authorised', isSelected: true },
      ]);
    });
  });
});
