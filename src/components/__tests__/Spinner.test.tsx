import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Spinner from '../ui/Spinner';

describe('Spinner', () => {
  it('renders with default size', () => {
    render(<Spinner />);
    const spinner = screen.getByRole('status', { hidden: true }) || document.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('renders with sm size', () => {
    const { container } = render(<Spinner size="sm" />);
    const spinner = container.querySelector('.h-4.w-4');
    expect(spinner).toBeTruthy();
  });

  it('renders with lg size', () => {
    const { container } = render(<Spinner size="lg" />);
    const spinner = container.querySelector('.h-12.w-12');
    expect(spinner).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(<Spinner className="py-12" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('py-12');
  });
});
