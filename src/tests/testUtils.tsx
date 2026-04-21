import { ChakraProvider } from '@chakra-ui/react';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';

// utility to wrap rendered components in ChakraProvider for tests that rely on Chakra UI context
const AllProviders = ({ children }: { children: React.ReactNode }) => {
  return <ChakraProvider>{children}</ChakraProvider>;
};

export const renderWithChakra = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllProviders, ...options });