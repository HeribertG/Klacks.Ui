import { CalendarSettingService } from './calendar-setting.service';

describe('CalendarSettingService', () => {
    let service: CalendarSettingService;

    beforeEach(() => {
        service = new CalendarSettingService();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('default values', () => {
        it('should have cellHeight = 45', () => {
            expect(service.cellHeight).toBe(45);
        });

        it('should have cellWidth = BASE_CELL_WIDTH (8)', () => {
            expect(service.cellWidth).toBe(8);
        });

        it('should have cellHeaderHeight = 55', () => {
            expect(service.cellHeaderHeight).toBe(55);
        });

        it('should have increaseBorder = 0.5', () => {
            expect(service.increaseBorder).toBe(0.5);
        });

        it('should have borderWidth = 1', () => {
            expect(service.borderWidth).toBe(1);
        });

        it('should have anchorWidth = 10', () => {
            expect(service.anchorWidth).toBe(10);
        });

        it('should have zoom = 1', () => {
            expect(service.zoom).toBe(1);
        });
    });

    describe('zoom', () => {
        it('should update cellWidth when zoom is set', () => {
            service.zoom = 2;

            expect(service.cellWidth).toBe(16);
        });

        it('should emit zoomChangingEvent when zoom is set', () => {
            const spy = vi.fn();
            service.zoomChangingEvent.subscribe(spy);

            service.zoom = 3;

            expect(spy).toHaveBeenCalledTimes(1);
        });

        it('should return correct zoom value after setting', () => {
            service.zoom = 2.5;

            expect(service.zoom).toBe(2.5);
        });

        it('should calculate cellWidth for zoom 0.5', () => {
            service.zoom = 0.5;

            expect(service.cellWidth).toBe(4);
        });

        it('should calculate cellWidth for zoom 5', () => {
            service.zoom = 5;

            expect(service.cellWidth).toBe(40);
        });

        it('should emit event on each zoom change', () => {
            const spy = vi.fn();
            service.zoomChangingEvent.subscribe(spy);

            service.zoom = 1;
            service.zoom = 2;
            service.zoom = 3;

            expect(spy).toHaveBeenCalledTimes(3);
        });
    });
});
