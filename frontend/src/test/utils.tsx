/**
 * Test utilities and render helpers.
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';

/**
 * Wrapper component with BrowserRouter for tests.
 */
function BrowserRouterWrapper({ children }: { children: ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

/**
 * Render with BrowserRouter context.
 */
export function renderWithRouter(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: BrowserRouterWrapper, ...options });
}

/**
 * Render with MemoryRouter for testing specific routes.
 */
export function renderWithMemoryRouter(
  ui: ReactElement,
  { initialEntries = ['/'] }: { initialEntries?: string[] } = {},
  options?: Omit<RenderOptions, 'wrapper'>
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;
  }
  return render(ui, { wrapper: Wrapper, ...options });
}

/**
 * Wait for loading state to complete.
 */
export async function waitForLoadingToComplete() {
  // Wait for loading spinner to disappear
  await new Promise((resolve) => setTimeout(resolve, 0));
}
