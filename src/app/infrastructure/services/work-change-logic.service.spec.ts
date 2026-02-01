import { describe, it, expect, beforeEach } from 'vitest';
import { WorkChangeLogicService, CorrectionMode } from './work-change-logic.service';
import { WorkTimeContext } from 'src/app/domain/models/work-change';
import { OwnTime } from 'src/app/domain/models/schedule-class';

describe('WorkChangeLogicService', () => {
  let service: WorkChangeLogicService;

  beforeEach(() => {
    service = new WorkChangeLogicService();
  });

  describe('createWorkTimeContext', () => {
    it('should detect midnight crossing when end is before start', () => {
      // Arrange
      const startTime = '22:00';
      const endTime = '06:00';

      // Act
      const context = service.createWorkTimeContext(startTime, endTime);

      // Assert
      expect(context.crossesMidnight).toBe(true);
      expect(context.workStartTime).toBe('22:00');
      expect(context.workEndTime).toBe('06:00');
    });

    it('should not detect midnight crossing for normal shift', () => {
      // Arrange
      const startTime = '08:00';
      const endTime = '16:00';

      // Act
      const context = service.createWorkTimeContext(startTime, endTime);

      // Assert
      expect(context.crossesMidnight).toBe(false);
    });
  });

  describe('validateCorrectionMode', () => {
    describe('AtStart mode', () => {
      it('should validate correction at start (before shift begins)', () => {
        // Arrange
        const workContext: WorkTimeContext = {
          workStartTime: '08:00',
          workEndTime: '16:00',
          crossesMidnight: false,
        };
        const wcStartTime = OwnTime.forTime('07', '45');
        const wcEndTime = OwnTime.forTime('08', '00');

        // Act
        const result = service.validateCorrectionMode(
          wcStartTime,
          wcEndTime,
          workContext,
          CorrectionMode.AtStart
        );

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.changeTime).toBe(0.25);
      });

      it('should reject correction at start if end does not match work start', () => {
        // Arrange
        const workContext: WorkTimeContext = {
          workStartTime: '08:00',
          workEndTime: '16:00',
          crossesMidnight: false,
        };
        const wcStartTime = OwnTime.forTime('07', '45');
        const wcEndTime = OwnTime.forTime('08', '15');

        // Act
        const result = service.validateCorrectionMode(
          wcStartTime,
          wcEndTime,
          workContext,
          CorrectionMode.AtStart
        );

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errorKey).toBe('dialog.correction.error.atStartInvalid');
      });
    });

    describe('AtEnd mode', () => {
      it('should validate correction at end (after shift ends)', () => {
        // Arrange
        const workContext: WorkTimeContext = {
          workStartTime: '08:00',
          workEndTime: '16:00',
          crossesMidnight: false,
        };
        const wcStartTime = OwnTime.forTime('16', '00');
        const wcEndTime = OwnTime.forTime('16', '30');

        // Act
        const result = service.validateCorrectionMode(
          wcStartTime,
          wcEndTime,
          workContext,
          CorrectionMode.AtEnd
        );

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.changeTime).toBe(0.5);
      });

      it('should reject correction at end if start does not match work end', () => {
        // Arrange
        const workContext: WorkTimeContext = {
          workStartTime: '08:00',
          workEndTime: '16:00',
          crossesMidnight: false,
        };
        const wcStartTime = OwnTime.forTime('15', '45');
        const wcEndTime = OwnTime.forTime('16', '30');

        // Act
        const result = service.validateCorrectionMode(
          wcStartTime,
          wcEndTime,
          workContext,
          CorrectionMode.AtEnd
        );

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errorKey).toBe('dialog.correction.error.atEndInvalid');
      });
    });

    describe('Within mode', () => {
      it('should validate correction within work hours', () => {
        // Arrange
        const workContext: WorkTimeContext = {
          workStartTime: '08:00',
          workEndTime: '16:00',
          crossesMidnight: false,
        };
        const wcStartTime = OwnTime.forTime('12', '00');
        const wcEndTime = OwnTime.forTime('12', '30');

        // Act
        const result = service.validateCorrectionMode(
          wcStartTime,
          wcEndTime,
          workContext,
          CorrectionMode.Within
        );

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.changeTime).toBe(-0.5);
      });

      it('should reject correction outside work hours', () => {
        // Arrange
        const workContext: WorkTimeContext = {
          workStartTime: '08:00',
          workEndTime: '16:00',
          crossesMidnight: false,
        };
        const wcStartTime = OwnTime.forTime('07', '00');
        const wcEndTime = OwnTime.forTime('07', '30');

        // Act
        const result = service.validateCorrectionMode(
          wcStartTime,
          wcEndTime,
          workContext,
          CorrectionMode.Within
        );

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errorKey).toBe('dialog.correction.error.withinInvalid');
      });
    });

    describe('with midnight crossing', () => {
      it('should validate correction at end for night shift', () => {
        // Arrange
        const workContext: WorkTimeContext = {
          workStartTime: '22:00',
          workEndTime: '06:00',
          crossesMidnight: true,
        };
        const wcStartTime = OwnTime.forTime('06', '00');
        const wcEndTime = OwnTime.forTime('06', '30');

        // Act
        const result = service.validateCorrectionMode(
          wcStartTime,
          wcEndTime,
          workContext,
          CorrectionMode.AtEnd
        );

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.changeTime).toBe(0.5);
      });

      it('should validate correction at start for night shift', () => {
        // Arrange
        const workContext: WorkTimeContext = {
          workStartTime: '22:00',
          workEndTime: '06:00',
          crossesMidnight: true,
        };
        const wcStartTime = OwnTime.forTime('21', '45');
        const wcEndTime = OwnTime.forTime('22', '00');

        // Act
        const result = service.validateCorrectionMode(
          wcStartTime,
          wcEndTime,
          workContext,
          CorrectionMode.AtStart
        );

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.changeTime).toBe(0.25);
      });
    });

    describe('zero duration', () => {
      it('should reject zero duration correction', () => {
        // Arrange
        const workContext: WorkTimeContext = {
          workStartTime: '08:00',
          workEndTime: '16:00',
          crossesMidnight: false,
        };
        const wcStartTime = OwnTime.forTime('08', '00');
        const wcEndTime = OwnTime.forTime('08', '00');

        // Act
        const result = service.validateCorrectionMode(
          wcStartTime,
          wcEndTime,
          workContext,
          CorrectionMode.AtStart
        );

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errorKey).toBe('dialog.correction.error.zeroTime');
      });
    });
  });

  describe('validateReplacementMode', () => {
    it('should validate replacement within work hours', () => {
      // Arrange
      const workContext: WorkTimeContext = {
        workStartTime: '08:00',
        workEndTime: '16:00',
        crossesMidnight: false,
      };
      const wcStartTime = OwnTime.forTime('08', '00');
      const wcEndTime = OwnTime.forTime('12', '00');

      // Act
      const result = service.validateReplacementMode(
        wcStartTime,
        wcEndTime,
        workContext,
        CorrectionMode.AtStart
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.changeTime).toBe(4);
    });

    it('should reject replacement outside work hours', () => {
      // Arrange
      const workContext: WorkTimeContext = {
        workStartTime: '08:00',
        workEndTime: '16:00',
        crossesMidnight: false,
      };
      const wcStartTime = OwnTime.forTime('07', '00');
      const wcEndTime = OwnTime.forTime('12', '00');

      // Act
      const result = service.validateReplacementMode(
        wcStartTime,
        wcEndTime,
        workContext,
        CorrectionMode.AtStart
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errorKey).toBe('dialog.replacement.error.outsideWork');
    });

    it('should validate replacement for night shift', () => {
      // Arrange
      const workContext: WorkTimeContext = {
        workStartTime: '22:00',
        workEndTime: '06:00',
        crossesMidnight: true,
      };
      const wcStartTime = OwnTime.forTime('22', '00');
      const wcEndTime = OwnTime.forTime('02', '00');

      // Act
      const result = service.validateReplacementMode(
        wcStartTime,
        wcEndTime,
        workContext,
        CorrectionMode.AtStart
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.changeTime).toBe(4);
    });
  });

  describe('getDefaultTimesForMode', () => {
    it('should return correct defaults for AtStart', () => {
      // Arrange
      const workContext: WorkTimeContext = {
        workStartTime: '08:00',
        workEndTime: '16:00',
        crossesMidnight: false,
      };

      // Act
      const result = service.getDefaultTimesForMode(CorrectionMode.AtStart, workContext);

      // Assert
      expect(result.startTime.toString()).toBe('07:45:00');
      expect(result.endTime.toString()).toBe('08:00:00');
    });

    it('should return correct defaults for AtEnd', () => {
      // Arrange
      const workContext: WorkTimeContext = {
        workStartTime: '08:00',
        workEndTime: '16:00',
        crossesMidnight: false,
      };

      // Act
      const result = service.getDefaultTimesForMode(CorrectionMode.AtEnd, workContext);

      // Assert
      expect(result.startTime.toString()).toBe('16:00:00');
      expect(result.endTime.toString()).toBe('16:15:00');
    });
  });

  describe('calculateDurationDisplay', () => {
    it('should calculate correct duration for normal shift', () => {
      // Arrange
      const workContext: WorkTimeContext = {
        workStartTime: '08:00',
        workEndTime: '16:00',
        crossesMidnight: false,
      };
      const wcStartTime = OwnTime.forTime('08', '00');
      const wcEndTime = OwnTime.forTime('10', '30');

      // Act
      const result = service.calculateDurationDisplay(wcStartTime, wcEndTime, workContext);

      // Assert
      expect(result.toString()).toBe('02:30:00');
    });

    it('should calculate correct duration for night shift correction', () => {
      // Arrange
      const workContext: WorkTimeContext = {
        workStartTime: '22:00',
        workEndTime: '06:00',
        crossesMidnight: true,
      };
      const wcStartTime = OwnTime.forTime('23', '00');
      const wcEndTime = OwnTime.forTime('01', '00');

      // Act
      const result = service.calculateDurationDisplay(wcStartTime, wcEndTime, workContext);

      // Assert
      expect(result.toString()).toBe('02:00:00');
    });
  });
});
