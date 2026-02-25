const { getReleasePlan, NO_VERSION_ERROR } = require('../releaseStrategy');

describe('releaseStrategy', () => {
  describe('getReleasePlan', () => {
    it('returns bump_and_tag for npm', () => {
      const plan = getReleasePlan('npm', '1.0.0');
      expect(plan.action).toBe('bump_and_tag');
      expect(plan.versionForTag).toBeNull();
    });

    it('returns bump_and_tag for npm even when version is null', () => {
      const plan = getReleasePlan('npm', null);
      expect(plan.action).toBe('bump_and_tag');
      expect(plan.versionForTag).toBeNull();
    });

    it('returns tag_only for cargo with version', () => {
      const plan = getReleasePlan('cargo', '0.2.0');
      expect(plan.action).toBe('tag_only');
      expect(plan.versionForTag).toBe('0.2.0');
    });

    it('returns tag_only for python with version', () => {
      const plan = getReleasePlan('python', '1.2.3');
      expect(plan.action).toBe('tag_only');
      expect(plan.versionForTag).toBe('1.2.3');
    });

    it('returns error for go (no version)', () => {
      const plan = getReleasePlan('go', null);
      expect(plan.action).toBe('error');
      expect(plan.error).toBe(NO_VERSION_ERROR);
    });

    it('returns error when version is empty string', () => {
      const plan = getReleasePlan('cargo', '');
      expect(plan.action).toBe('error');
      expect(plan.error).toBe(NO_VERSION_ERROR);
    });

    it('returns error when version is whitespace', () => {
      const plan = getReleasePlan('python', '   ');
      expect(plan.action).toBe('error');
    });

    it('returns error for invalid version (formatTag returns null)', () => {
      const plan = getReleasePlan('cargo', 123);
      expect(plan.action).toBe('error');
      expect(plan.error).toBe('Invalid version');
    });

    it('returns tag_only with version for go when version provided', () => {
      const plan = getReleasePlan('go', '1.0.0');
      expect(plan.action).toBe('tag_only');
      expect(plan.versionForTag).toBe('1.0.0');
    });

    it('returns tag_only for php with version', () => {
      const plan = getReleasePlan('php', '2.0.1');
      expect(plan.action).toBe('tag_only');
      expect(plan.versionForTag).toBe('2.0.1');
    });
  });
});
