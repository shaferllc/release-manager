/**
 * Accessibility testing utilities using axe-core via jest-axe.
 *
 * Use `axe(element)` to run axe on a DOM element and assert with
 * `expect(results).toHaveNoViolations()`.
 *
 * Configuration:
 * - `region` rule disabled for isolated component tests (no landmark requirement)
 * - `color-contrast` disabled (does not work in jsdom)
 */
import { configureAxe, toHaveNoViolations } from 'jest-axe';

export { toHaveNoViolations };

export const axe = configureAxe({
  rules: {
    // Isolated components don't need landmarks; full pages do
    region: { enabled: false },
    // Color contrast does not work in jsdom
    'color-contrast': { enabled: false },
  },
});

/**
 * Run axe on a Vue Test Utils wrapper element.
 * @param {import('@vue/test-utils').VueWrapper} wrapper
 * @param {object} [options] - Additional axe options
 * @returns {Promise<import('axe-core').AxeResults>}
 */
export async function runAxe(wrapper, options = {}) {
  const el = wrapper?.element ?? wrapper;
  if (!el) throw new Error('No element to run axe on');
  return axe(el, options);
}
