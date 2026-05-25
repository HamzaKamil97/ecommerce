import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../src/App';

describe('App smoke', () => {
  it('renders the login screen on first launch', () => {
    render(<App />);
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });
});
