import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LockedShell } from '../src/ui/screens/super-admin/LockedShell';

describe('super-admin LockedShell', () => {
  it('renders title and "designed today" message', () => {
    render(
      <MemoryRouter initialEntries={['/x']}>
        <Routes>
          <Route path="/x" element={<LockedShell title="All shops" comingIn="shop #2 onboards" />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('All shops')).toBeTruthy();
    expect(screen.getByText(/Mockup designed today, built when shop #2 onboards/)).toBeTruthy();
  });
});
