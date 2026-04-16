import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react';
import SearchBar from '../components/sidebar/searchBar';
import { renderWithChakra } from './testUtils';
import type { TiplocData } from '../types';

const sheffield: TiplocData = {
  Name: 'Sheffield',
  Tiploc: 'SHEFFLD',
  Stanox: 12345,
  InBPlan: true,
  InTPS: true,
  IsTiploc: true,
  Codes: [],
  Details: {
    BPlan_TimingPoint: null,
    TPS_StationType: null,
    TPS_StationCategory: 'Interchange',
    CRS: 'SHF',
    Nalco: null,
    OffNetwork: false,
    ForceLPB: null,
    CompulsoryStop: false,
    UIC: null,
    Zone: null,
  },
  Latitude: 53.38,
  Longitude: -1.46,
};

const defaultProps = {
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
};

describe('SearchBar', () => {
  it('renders station search mode and passes input changes upward', () => {
    const onSearchTermChange = jest.fn();

    renderWithChakra(
      <SearchBar {...defaultProps} onSearchTermChange={onSearchTermChange} />
    );

    const input = screen.getByPlaceholderText('Search station (e.g. "Sheffield")');
    fireEvent.change(input, { target: { value: 'Sheffield' } });

    expect(onSearchTermChange).toHaveBeenCalledWith('Sheffield');
  });

  it('uses the headcode placeholder in train search mode', () => {
    renderWithChakra(
      <SearchBar {...defaultProps} searchMode="train" />
    );

    expect(screen.getByPlaceholderText('Search by headcode (e.g. "1F45")')).toBeTruthy();
  });

  it('calls onClear when the clear icon is clicked', () => {
    const onClear = jest.fn();

    renderWithChakra(
      <SearchBar {...defaultProps} searchTerm="Sheffield" onClear={onClear} />
    );

    fireEvent.click(screen.getByRole('button', { name: /clear search/i }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('shows station suggestions and calls onSuggestionSelect when one is clicked', () => {
    const onSuggestionSelect = jest.fn();

    renderWithChakra(
      <SearchBar
        {...defaultProps}
        searchTerm="She"
        suggestions={[sheffield]}
        showSuggestions
        onSuggestionSelect={onSuggestionSelect}
      />
    );

    fireEvent.click(screen.getByText('Sheffield'));

    expect(onSuggestionSelect).toHaveBeenCalledWith(sheffield);
  });

  it('disables the search button when the search term is empty', () => {
    renderWithChakra(<SearchBar {...defaultProps} />);

    const searchButton = screen.getByRole('button', {
      name: /search for station or train/i,
    }) as HTMLButtonElement;

    expect(searchButton.disabled).toBe(true);
  });
});