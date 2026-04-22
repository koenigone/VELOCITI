import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import SearchBar from '../components/sidebar/searchBar';
import { renderWithChakra } from './testUtils';
import type { TiplocData } from '../types';
import { createTiploc } from './factories';

type SearchBarProps = ComponentProps<typeof SearchBar>;

const sheffield = createTiploc(); // using default factory values for Sheffield
const derby = createTiploc({      // overriding factory values to create a different station
  Name: 'Derby',
  Tiploc: 'DERBY',
  Details: {
    ...sheffield.Details,
    CRS: 'DBY',
  },
});

// render the SearchBar with default props and allow overrides for specific tests
const setup = (overrides: Partial<SearchBarProps> = {}) => {
  const props: SearchBarProps = {
    searchMode: 'station' as const,
    searchTerm: '',
    onSearchTermChange: jest.fn(),
    onSearch: jest.fn(),
    onClear: jest.fn(),
    onKeyDown: jest.fn(),
    isLoading: false,
    suggestions: [] as TiplocData[],
    showSuggestions: false,
    onShowSuggestionsChange: jest.fn(),
    highlightedIndex: -1,
    onSuggestionSelect: jest.fn(),
    ...overrides,
  };

  renderWithChakra(<SearchBar {...props} />);
  return props;
};


// tests for SearchBar component
describe('SearchBar', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('passes input changes and key presses upward from the station search field', () => {
    const onSearchTermChange = jest.fn();
    const onKeyDown = jest.fn();

    setup({ onSearchTermChange, onKeyDown });

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Sheffield' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSearchTermChange).toHaveBeenCalledWith('Sheffield');
    expect(onKeyDown).toHaveBeenCalledWith(expect.objectContaining({ key: 'Enter' }));
  });

  it('uses the headcode placeholder in train search mode', () => {
    setup({ searchMode: 'train' });

    expect(screen.getByPlaceholderText('Search by headcode (e.g. "1F45")')).toBeTruthy();
  });

  it('calls onClear when the clear icon is clicked', () => {
    const onClear = jest.fn();

    setup({ searchTerm: 'Sheffield', onClear });

    fireEvent.click(screen.getByRole('button', { name: /clear search/i }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('shows station suggestions and selects the clicked TIPLOC', () => {
    const onSuggestionSelect = jest.fn();

    setup({
      searchTerm: 'She',
      suggestions: [sheffield, derby],
      showSuggestions: true,
      highlightedIndex: 1,
      onSuggestionSelect,
    });

    expect(screen.getByText('Matching Stations')).toBeTruthy();
    fireEvent.click(screen.getByText('Derby'));

    expect(onSuggestionSelect).toHaveBeenCalledWith(derby);
  });

  it('opens suggestions on focus only when station suggestions are available', () => {
    const onShowSuggestionsChange = jest.fn();

    setup({
      suggestions: [sheffield],
      onShowSuggestionsChange,
    });

    fireEvent.focus(screen.getByRole('textbox'));

    expect(onShowSuggestionsChange).toHaveBeenCalledWith(true);
  });

  it('hides suggestions when the user clicks outside the input and dropdown', () => {
    const onShowSuggestionsChange = jest.fn();

    setup({
      searchTerm: 'She',
      suggestions: [sheffield],
      showSuggestions: true,
      onShowSuggestionsChange,
    });

    fireEvent.mouseDown(document.body);

    expect(onShowSuggestionsChange).toHaveBeenCalledWith(false);
  });

  it('does not render station suggestions while in train search mode', () => {
    setup({
      searchMode: 'train',
      searchTerm: '1A',
      suggestions: [sheffield],
      showSuggestions: true,
    });

    expect(screen.queryByText('Matching Stations')).toBeNull();
  });

  it('disables the search button when the search term is empty', () => {
    setup();

    const searchButton = screen.getByRole('button', {
      name: /search for station or train/i,
    }) as HTMLButtonElement;

    expect(searchButton.disabled).toBe(true);
  });

  it('calls onSearch when a non-empty search is submitted', () => {
    const onSearch = jest.fn();

    setup({ searchTerm: 'Sheffield', onSearch });

    const searchButton = screen.getByRole('button', {
      name: /search for station or train/i,
    });

    expect((searchButton as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(searchButton);
    expect(onSearch).toHaveBeenCalledTimes(1);
  });
});