import { ScrollService } from './scroll.service';

describe('ScrollService', () => {
  let service: ScrollService;

  beforeEach(() => {
    service = new ScrollService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set horizontal and vertical scroll values', () => {
    service.maxCols = 10;
    service.maxRows = 10;

    service.horizontalScrollPosition = 5;
    expect(service.horizontalScrollPosition).toBe(5);

    service.verticalScrollPosition = 10;
    expect(service.verticalScrollPosition).toBe(10);
  });

  it('should reset scroll positions', () => {
    service.horizontalScrollPosition = 5;
    service.verticalScrollPosition = 10;
    service.resetScrollPosition();

    expect(service.horizontalScrollPosition).toBe(0);
    expect(service.verticalScrollPosition).toBe(0);
  });

  it('should adjust values within bounds', () => {
    service.setMetrics(2, 10, 2, 10);

    service.horizontalScrollPosition = 11;
    expect(service.horizontalScrollPosition).toBe(9);

    service.verticalScrollPosition = 11;
    expect(service.verticalScrollPosition).toBe(9);
  });

  it('should calculate last differences correctly', () => {
    service.maxCols = 10;
    service.maxRows = 10;

    service.horizontalScrollPosition = 5;
    service.verticalScrollPosition = 5;

    service.horizontalScrollPosition = 3;
    expect(service.horizontalScrollDelta).toBe(2);

    service.verticalScrollPosition = 3;
    expect(service.verticalScrollDelta).toBe(2);
  });
});
