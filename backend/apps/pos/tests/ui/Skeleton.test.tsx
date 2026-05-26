import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton, SkeletonText } from '../../src/ui/components/Skeleton';

describe('Skeleton', () => {
  it('renders with skel class', () => {
    const { container } = render(<Skeleton width={120} height={12} />);
    expect(container.firstChild).toHaveClass('skel');
  });
  it('SkeletonText renders N lines', () => {
    const { container } = render(<SkeletonText lines={3} />);
    expect(container.querySelectorAll('.skel-line').length).toBe(3);
  });
});
