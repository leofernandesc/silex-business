import { describe, expect, it } from 'vitest';
import { hasTransport } from './capabilities';
import { canAccessRoute, routes } from './navigation/routes';
import { homeNavigation } from './home/model';

describe('server-supplied transport module capability', () => {
  it('defaults off independently of the username and role', () => {
    for (const user of [null, {role:'admin' as const}, {role:'admin' as const,capabilities:[]}, {role:'operator' as const,capabilities:['transport_operations']}]) {
      expect(hasTransport(user)).toBe(false);
      expect(canAccessRoute(user, 'subcontracted-freight')).toBe(false);
    }
  });
  it('keeps every generic admin route and exposes transport only with an explicit grant', () => {
    const demo={role:'admin' as const,capabilities:[]};
    const authorized={...demo,capabilities:['transport_operations']};
    for(const route of routes){
      expect(canAccessRoute(demo,route.id)).toBe(route.id!=='subcontracted-freight');
      expect(canAccessRoute(authorized,route.id)).toBe(true);
    }
    expect(homeNavigation(demo).available.some(r=>r.id==='subcontracted-freight')).toBe(false);
    expect(homeNavigation(authorized).available.some(r=>r.id==='subcontracted-freight')).toBe(true);
  });
});
