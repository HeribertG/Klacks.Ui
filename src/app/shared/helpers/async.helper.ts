/**
 * Async Helper
 *
 * Pure functions for async operations.
 */

/**
 * Creates a delay/timeout promise.
 *
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after specified time
 *
 * @example
 * await delay(1000); // Wait 1 second
 */
export function delay(ms: number): Promise<unknown> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
