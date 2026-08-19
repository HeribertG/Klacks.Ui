import { TestBed } from '@angular/core/testing';
import { BackendAvailabilityService } from './backend-availability.service';
import { environment } from 'src/environments/environment';

const BACKEND_RESPONSE_URL = environment.baseUrl + 'Countries/';
const ASSET_RESPONSE_URL = 'http://localhost:4200/assets/i18n/de.json';

const STARTUP_GRACE_PERIOD_MS = 45000;
const OUTAGE_GRACE_PERIOD_MS = 10000;
const PROBE_INTERVAL_BEFORE_OVERLAY_MS = 1000;
const PROBE_INTERVAL_AFTER_OVERLAY_MS = 2000;
const CLOCK_STEP_MS = 500;
const MEASURED_SLOWEST_BACKEND_START_MS = 41000;
const BACKEND_READY_AT_MS = 20000;
const ANSWERED_STORAGE_KEY = 'klacks.backend-has-answered';

describe('BackendAvailabilityService', () => {
  let service: BackendAvailabilityService;
  let fetchMock: ReturnType<typeof vi.fn>;
  let reloadCount: number;
  let now: number;

  const advance = async (ms: number): Promise<void> => {
    for (let elapsed = 0; elapsed < ms; elapsed += CLOCK_STEP_MS) {
      now += CLOCK_STEP_MS;
      await vi.advanceTimersByTimeAsync(CLOCK_STEP_MS);
    }
  };

  const newServiceInstance = (): BackendAvailabilityService => {
    const instance = new BackendAvailabilityService();
    (instance as unknown as { reloadPage: () => void }).reloadPage = () => {
      reloadCount++;
    };
    return instance;
  };

  beforeEach(() => {
    now = 0;
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    TestBed.configureTestingModule({ providers: [BackendAvailabilityService] });
    service = TestBed.inject(BackendAvailabilityService);

    reloadCount = 0;
    (service as unknown as { reloadPage: () => void }).reloadPage = () => {
      reloadCount++;
    };
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('while the backend has never answered (application startup)', () => {
    it('keeps the overlay hidden for longer than the slowest measured backend start', async () => {
      fetchMock.mockResolvedValue({ ok: false });

      service.reportUnavailable();
      await advance(MEASURED_SLOWEST_BACKEND_START_MS);

      expect(service.isUnavailable()).toBe(false);
    });

    it('never shows the overlay and does not reload when the backend finishes booting', async () => {
      fetchMock.mockImplementation(async () => ({ ok: now >= BACKEND_READY_AT_MS }));

      service.reportUnavailable();
      await advance(BACKEND_READY_AT_MS + PROBE_INTERVAL_BEFORE_OVERLAY_MS);

      expect(service.isUnavailable()).toBe(false);
      expect(reloadCount).toBe(0);
    });

    it('still shows the overlay once the startup grace period has passed', async () => {
      fetchMock.mockResolvedValue({ ok: false });

      service.reportUnavailable();
      await advance(STARTUP_GRACE_PERIOD_MS + PROBE_INTERVAL_BEFORE_OVERLAY_MS);

      expect(service.isUnavailable()).toBe(true);
    });

    it('does not switch to the short grace period for an asset response', async () => {
      fetchMock.mockResolvedValue({ ok: false });
      service.reportReachable(ASSET_RESPONSE_URL);

      service.reportUnavailable();
      await advance(OUTAGE_GRACE_PERIOD_MS + PROBE_INTERVAL_BEFORE_OVERLAY_MS);

      expect(service.isUnavailable()).toBe(false);
    });

    it('does not remember an asset response for the next page load', () => {
      service.reportReachable(ASSET_RESPONSE_URL);

      expect(sessionStorage.getItem(ANSWERED_STORAGE_KEY)).toBeNull();
    });
  });

  describe('after the backend has answered at least once', () => {
    beforeEach(() => {
      service.reportReachable(BACKEND_RESPONSE_URL);
    });

    it('keeps the overlay hidden below the outage grace period', async () => {
      fetchMock.mockResolvedValue({ ok: false });

      service.reportUnavailable();
      await advance(OUTAGE_GRACE_PERIOD_MS - PROBE_INTERVAL_BEFORE_OVERLAY_MS);

      expect(service.isUnavailable()).toBe(false);
    });

    it('shows the overlay once the health endpoint keeps failing beyond the outage grace period', async () => {
      fetchMock.mockResolvedValue({ ok: false });

      service.reportUnavailable();
      await advance(OUTAGE_GRACE_PERIOD_MS + PROBE_INTERVAL_BEFORE_OVERLAY_MS);

      expect(service.isUnavailable()).toBe(true);
    });

    it('never shows the overlay when the health endpoint answers right after the failed request', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false }).mockResolvedValue({ ok: true });

      service.reportUnavailable();
      await advance(2 * OUTAGE_GRACE_PERIOD_MS);

      expect(service.isUnavailable()).toBe(false);
      expect(reloadCount).toBe(0);
    });

    it('reloads the page when the backend recovers after the overlay was shown', async () => {
      fetchMock.mockResolvedValue({ ok: false });

      service.reportUnavailable();
      await advance(OUTAGE_GRACE_PERIOD_MS + PROBE_INTERVAL_BEFORE_OVERLAY_MS);
      expect(service.isUnavailable()).toBe(true);

      fetchMock.mockResolvedValue({ ok: true });
      await advance(PROBE_INTERVAL_AFTER_OVERLAY_MS);

      expect(reloadCount).toBe(1);
    });

    it('remembers the answer for the next page load', () => {
      expect(sessionStorage.getItem(ANSWERED_STORAGE_KEY)).toBe('true');
    });
  });

  describe('across a page reload within the same tab', () => {
    it('uses the short outage grace period although the new instance never saw an answer', async () => {
      service.reportReachable(BACKEND_RESPONSE_URL);

      const afterReload = newServiceInstance();
      fetchMock.mockResolvedValue({ ok: false });

      afterReload.reportUnavailable();
      await advance(OUTAGE_GRACE_PERIOD_MS + PROBE_INTERVAL_BEFORE_OVERLAY_MS);

      expect(afterReload.isUnavailable()).toBe(true);
    });

    it('keeps the long startup grace period when the tab never got an answer', async () => {
      const freshTab = newServiceInstance();
      fetchMock.mockResolvedValue({ ok: false });

      freshTab.reportUnavailable();
      await advance(MEASURED_SLOWEST_BACKEND_START_MS);

      expect(freshTab.isUnavailable()).toBe(false);
    });

    it('remembers the recovery that happened while the overlay was shown', async () => {
      fetchMock.mockResolvedValue({ ok: false });

      service.reportUnavailable();
      await advance(STARTUP_GRACE_PERIOD_MS + PROBE_INTERVAL_BEFORE_OVERLAY_MS);
      expect(service.isUnavailable()).toBe(true);

      fetchMock.mockResolvedValue({ ok: true });
      await advance(PROBE_INTERVAL_AFTER_OVERLAY_MS);

      expect(reloadCount).toBe(1);
      expect(sessionStorage.getItem(ANSWERED_STORAGE_KEY)).toBe('true');
    });
  });
});
