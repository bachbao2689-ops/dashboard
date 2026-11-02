import test from 'node:test';
import assert from 'node:assert/strict';
import { canViewTeamManagement } from '../src/lib/roleScope.ts';

/**
 * Pure evaluation function matching RootRedirect in Dev/src/App.tsx
 */
function resolveRootRedirect({ innerWidth, profile, search = '' }) {
  if (search && (search.includes('project=') || search.includes('campaign='))) {
    return `/workflow${search}`;
  }
  const isMobileViewport = innerWidth < 1280;
  if (isMobileViewport) {
    return '/mobile-home';
  }
  if (canViewTeamManagement(profile)) {
    return '/ui-dashboard';
  }
  return '/my-tasks';
}

/**
 * Pure evaluation function matching MobileHomeRoute guard in Dev/src/App.tsx
 */
function resolveMobileHomeGuard({ innerWidth, profile }) {
  const isDesktopViewport = innerWidth >= 1280;
  if (isDesktopViewport) {
    if (canViewTeamManagement(profile)) {
      return '/ui-dashboard';
    }
    return '/my-tasks';
  }
  return null; // Allows rendering MobileHomeHub
}

test('desktop entrance routing: Manager and Leader go to /ui-dashboard, Staff to /my-tasks', () => {
  const admin = { role: 'admin', employment_level: 'ADMIN' };
  const manager = { role: 'manager', employment_level: 'Manager' };
  const leader = { role: 'leader', employment_level: 'Leader' };
  const staff = { role: 'member', employment_level: 'Nhân viên' };
  const unassigned = { role: 'member', employment_level: null };

  const desktopWidth = 1440;

  assert.equal(resolveRootRedirect({ innerWidth: desktopWidth, profile: admin }), '/ui-dashboard');
  assert.equal(resolveRootRedirect({ innerWidth: desktopWidth, profile: manager }), '/ui-dashboard');
  assert.equal(resolveRootRedirect({ innerWidth: desktopWidth, profile: leader }), '/ui-dashboard');
  assert.equal(resolveRootRedirect({ innerWidth: desktopWidth, profile: staff }), '/my-tasks');
  assert.equal(resolveRootRedirect({ innerWidth: desktopWidth, profile: unassigned }), '/my-tasks');
  assert.equal(resolveRootRedirect({ innerWidth: desktopWidth, profile: null }), '/my-tasks');
});

test('mobile entrance routing: all viewports < 1280px go to /mobile-home', () => {
  const manager = { role: 'manager', employment_level: 'Manager' };
  const staff = { role: 'member', employment_level: 'Nhân viên' };

  for (const width of [360, 390, 412, 768, 1024, 1279]) {
    assert.equal(resolveRootRedirect({ innerWidth: width, profile: manager }), '/mobile-home');
    assert.equal(resolveRootRedirect({ innerWidth: width, profile: staff }), '/mobile-home');
  }
});

test('desktop guard on /mobile-home: blocks desktop view and redirects to appropriate desktop page', () => {
  const manager = { role: 'manager', employment_level: 'Manager' };
  const leader = { role: 'leader', employment_level: 'Leader' };
  const staff = { role: 'member', employment_level: 'Nhân viên' };

  for (const desktopWidth of [1280, 1440, 1920, 2560]) {
    assert.equal(resolveMobileHomeGuard({ innerWidth: desktopWidth, profile: manager }), '/ui-dashboard');
    assert.equal(resolveMobileHomeGuard({ innerWidth: desktopWidth, profile: leader }), '/ui-dashboard');
    assert.equal(resolveMobileHomeGuard({ innerWidth: desktopWidth, profile: staff }), '/my-tasks');
  }

  // Mobile viewport allows rendering children (returns null)
  for (const mobileWidth of [360, 390, 768, 1024, 1279]) {
    assert.equal(resolveMobileHomeGuard({ innerWidth: mobileWidth, profile: manager }), null);
    assert.equal(resolveMobileHomeGuard({ innerWidth: mobileWidth, profile: staff }), null);
  }
});

test('query params preservation on root entrance: project and campaign links go directly to /workflow', () => {
  const staff = { role: 'member', employment_level: 'Nhân viên' };
  assert.equal(
    resolveRootRedirect({ innerWidth: 1440, profile: staff, search: '?project=123' }),
    '/workflow?project=123'
  );
  assert.equal(
    resolveRootRedirect({ innerWidth: 390, profile: staff, search: '?campaign=456' }),
    '/workflow?campaign=456'
  );
});
