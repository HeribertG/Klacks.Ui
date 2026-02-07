import { describe, it, expect, beforeEach } from 'vitest';
import { WorkLockLevelService } from './work-lock-level.service';
import { WorkLockLevel } from 'src/app/domain/enums/work-lock-level.enum';
import { IScheduleCell, WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-class';

function createEntry(overrides: Partial<IScheduleCell> = {}): IScheduleCell {
  return {
    id: 'entry-1',
    entryType: WorkScheduleEntryType.Work,
    sourceId: 'source-1',
    clientId: 'client-1',
    entryDate: new Date('2025-01-15'),
    startTime: '08:00',
    endTime: '16:00',
    changeTime: null,
    surcharges: null,
    workChangeType: null,
    description: null,
    information: null,
    amount: null,
    toInvoice: null,
    taxable: null,
    entryId: 'shift-1',
    entryName: 'Test Shift',
    abbreviation: 'TS',
    replaceClientId: null,
    isReplacementEntry: false,
    lockLevel: WorkLockLevel.None,
    isGroupRestricted: false,
    ...overrides,
  };
}

describe('WorkLockLevelService', () => {
  let service: WorkLockLevelService;

  beforeEach(() => {
    service = new WorkLockLevelService();
  });

  describe('canEditEntry', () => {
    it('should allow editing when lockLevel is None and not group restricted', () => {
      // Arrange
      const entry = createEntry({ lockLevel: WorkLockLevel.None, isGroupRestricted: false });

      // Act
      const result = service.canEditEntry(entry, false);

      // Assert
      expect(result).toBe(true);
    });

    it('should block editing when lockLevel is Confirmed', () => {
      // Arrange
      const entry = createEntry({ lockLevel: WorkLockLevel.Confirmed });

      // Act
      const result = service.canEditEntry(entry, false);

      // Assert
      expect(result).toBe(false);
    });

    it('should block editing when lockLevel is Approved', () => {
      // Arrange
      const entry = createEntry({ lockLevel: WorkLockLevel.Approved });

      // Act
      const result = service.canEditEntry(entry, false);

      // Assert
      expect(result).toBe(false);
    });

    it('should block editing when lockLevel is Closed', () => {
      // Arrange
      const entry = createEntry({ lockLevel: WorkLockLevel.Closed });

      // Act
      const result = service.canEditEntry(entry, false);

      // Assert
      expect(result).toBe(false);
    });

    it('should block editing when group restricted', () => {
      // Arrange
      const entry = createEntry({ lockLevel: WorkLockLevel.None, isGroupRestricted: true });

      // Act
      const result = service.canEditEntry(entry, false);

      // Assert
      expect(result).toBe(false);
    });

    it('should allow editing for admin regardless of lockLevel', () => {
      // Arrange
      const entry = createEntry({ lockLevel: WorkLockLevel.Confirmed });

      // Act
      const result = service.canEditEntry(entry, true);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('canConfirm', () => {
    it('should allow confirm when lockLevel is None', () => {
      // Arrange
      const entry = createEntry({ lockLevel: WorkLockLevel.None, isGroupRestricted: false });

      // Act
      const result = service.canConfirm(entry);

      // Assert
      expect(result).toBe(true);
    });

    it('should block confirm when lockLevel is Confirmed', () => {
      // Arrange
      const entry = createEntry({ lockLevel: WorkLockLevel.Confirmed });

      // Act
      const result = service.canConfirm(entry);

      // Assert
      expect(result).toBe(false);
    });

    it('should block confirm when group restricted', () => {
      // Arrange
      const entry = createEntry({ lockLevel: WorkLockLevel.None, isGroupRestricted: true });

      // Act
      const result = service.canConfirm(entry);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('canUnconfirm', () => {
    it('should allow unconfirm when lockLevel is Confirmed', () => {
      // Arrange
      const entry = createEntry({ lockLevel: WorkLockLevel.Confirmed });

      // Act
      const result = service.canUnconfirm(entry, false);

      // Assert
      expect(result).toBe(true);
    });

    it('should block unconfirm for non-admin when lockLevel is Approved', () => {
      // Arrange
      const entry = createEntry({ lockLevel: WorkLockLevel.Approved });

      // Act
      const result = service.canUnconfirm(entry, false);

      // Assert
      expect(result).toBe(false);
    });

    it('should allow unconfirm for supervisor when lockLevel is Approved', () => {
      // Arrange
      const entry = createEntry({ lockLevel: WorkLockLevel.Approved });

      // Act
      const result = service.canUnconfirm(entry, false, true);

      // Assert
      expect(result).toBe(true);
    });

    it('should allow unconfirm for admin at any level', () => {
      // Arrange
      const entry = createEntry({ lockLevel: WorkLockLevel.Closed });

      // Act
      const result = service.canUnconfirm(entry, true);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('canSeal', () => {
    it('should allow anyone to seal to Confirmed', () => {
      // Arrange & Act
      const result = service.canSeal(WorkLockLevel.None, WorkLockLevel.Confirmed, false, false);

      // Assert
      expect(result).toBe(true);
    });

    it('should block user from sealing to Approved', () => {
      // Arrange & Act
      const result = service.canSeal(WorkLockLevel.None, WorkLockLevel.Approved, false, false);

      // Assert
      expect(result).toBe(false);
    });

    it('should allow supervisor to seal to Approved', () => {
      // Arrange & Act
      const result = service.canSeal(WorkLockLevel.None, WorkLockLevel.Approved, false, true);

      // Assert
      expect(result).toBe(true);
    });

    it('should block supervisor from sealing to Closed', () => {
      // Arrange & Act
      const result = service.canSeal(WorkLockLevel.None, WorkLockLevel.Closed, false, true);

      // Assert
      expect(result).toBe(false);
    });

    it('should allow admin to seal to Closed', () => {
      // Arrange & Act
      const result = service.canSeal(WorkLockLevel.None, WorkLockLevel.Closed, true, false);

      // Assert
      expect(result).toBe(true);
    });

    it('should block sealing to same or lower level', () => {
      // Arrange & Act
      const result = service.canSeal(WorkLockLevel.Approved, WorkLockLevel.Confirmed, true, true);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('canUnseal', () => {
    it('should return false for None level', () => {
      // Arrange & Act
      const result = service.canUnseal(WorkLockLevel.None, true, true);

      // Assert
      expect(result).toBe(false);
    });

    it('should allow anyone to unseal Confirmed', () => {
      // Arrange & Act
      const result = service.canUnseal(WorkLockLevel.Confirmed, false, false);

      // Assert
      expect(result).toBe(true);
    });

    it('should block user from unsealing Approved', () => {
      // Arrange & Act
      const result = service.canUnseal(WorkLockLevel.Approved, false, false);

      // Assert
      expect(result).toBe(false);
    });

    it('should allow supervisor to unseal Approved', () => {
      // Arrange & Act
      const result = service.canUnseal(WorkLockLevel.Approved, false, true);

      // Assert
      expect(result).toBe(true);
    });

    it('should block supervisor from unsealing Closed', () => {
      // Arrange & Act
      const result = service.canUnseal(WorkLockLevel.Closed, false, true);

      // Assert
      expect(result).toBe(false);
    });

    it('should allow admin to unseal Closed', () => {
      // Arrange & Act
      const result = service.canUnseal(WorkLockLevel.Closed, true, false);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('getLockIcon', () => {
    it('should return empty string for None', () => {
      // Arrange & Act
      const result = service.getLockIcon(WorkLockLevel.None);

      // Assert
      expect(result).toBe('');
    });

    it('should return SVG for Confirmed', () => {
      // Arrange & Act
      const result = service.getLockIcon(WorkLockLevel.Confirmed);

      // Assert
      expect(result).toContain('svg');
      expect(result).toContain('positiveColor');
    });

    it('should return SVG for Approved', () => {
      // Arrange & Act
      const result = service.getLockIcon(WorkLockLevel.Approved);

      // Assert
      expect(result).toContain('svg');
      expect(result).toContain('warningColor');
    });

    it('should return SVG for Closed', () => {
      // Arrange & Act
      const result = service.getLockIcon(WorkLockLevel.Closed);

      // Assert
      expect(result).toContain('svg');
      expect(result).toContain('negativeColor');
    });
  });

  describe('getLockTooltip', () => {
    it('should return empty for None', () => {
      // Arrange & Act
      const result = service.getLockTooltip(WorkLockLevel.None, false);

      // Assert
      expect(result).toBe('');
    });

    it('should return groupRestricted tooltip when group restricted', () => {
      // Arrange & Act
      const result = service.getLockTooltip(WorkLockLevel.None, true);

      // Assert
      expect(result).toBe('lockLevel.groupRestricted');
    });

    it('should return confirmed tooltip', () => {
      // Arrange & Act
      const result = service.getLockTooltip(WorkLockLevel.Confirmed, false);

      // Assert
      expect(result).toBe('lockLevel.confirmed');
    });

    it('should return approved tooltip', () => {
      // Arrange & Act
      const result = service.getLockTooltip(WorkLockLevel.Approved, false);

      // Assert
      expect(result).toBe('lockLevel.approved');
    });

    it('should return closed tooltip', () => {
      // Arrange & Act
      const result = service.getLockTooltip(WorkLockLevel.Closed, false);

      // Assert
      expect(result).toBe('lockLevel.closed');
    });
  });
});
