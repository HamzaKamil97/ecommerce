import { describe, it, expect, beforeEach } from 'vitest';
import { useSession } from '../src/state/session';
import { useManagerSession } from '../src/state/manager-session';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  useSession.setState({ cashier_id: null, cashier_name: null, role: null });
  useManagerSession.setState({ manager_id: null, manager_name: null });
});

describe('session persistence', () => {
  it('persists cashier session to localStorage', () => {
    useSession.getState().signIn({ cashier_id: 'c1', cashier_name: 'Hala', role: 'cashier' });
    expect(localStorage.getItem('hanoot.session')).toContain('c1');
  });

  it('persists manager session to sessionStorage NOT localStorage', () => {
    useManagerSession.getState().signIn({ manager_id: 'm1', manager_name: 'QA' });
    expect(sessionStorage.getItem('hanoot.manager-session')).toContain('m1');
    expect(localStorage.getItem('hanoot.manager-session')).toBeNull();
  });

  it('signOut clears persisted cashier session', () => {
    useSession.getState().signIn({ cashier_id: 'c1', cashier_name: 'Hala', role: 'cashier' });
    useSession.getState().signOut();
    expect(useSession.getState().cashier_id).toBeNull();
  });
});
