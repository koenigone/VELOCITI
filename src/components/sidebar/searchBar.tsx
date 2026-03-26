import { useEffect, useRef } from 'react';
import {
  Box, Flex, Input, Text, Button, Badge,
  InputGroup, InputLeftElement
} from '@chakra-ui/react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import type { TiplocData } from '../../types';


type SearchMode = 'station' | 'train';

interface SearchBarProps {
  searchMode: SearchMode;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onSearch: () => void;
  onClear: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isLoading: boolean;
  // autocomplete
  suggestions: TiplocData[];
  showSuggestions: boolean;
  onShowSuggestionsChange: (show: boolean) => void;
  highlightedIndex: number;
  onSuggestionSelect: (tiploc: TiplocData) => void;
}


const SearchBar = ({
  searchMode,
  searchTerm,
  onSearchTermChange,
  onSearch,
  onClear,
  onKeyDown,
  isLoading,
  suggestions,
  showSuggestions,
  onShowSuggestionsChange,
  highlightedIndex,
  onSuggestionSelect,
}: SearchBarProps) => {

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // close suggestions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)) {
        onShowSuggestionsChange(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onShowSuggestionsChange]);


  return (
    <Box p="4" borderBottomWidth="1px" borderColor="gray.200" bg="white" shadow="sm" zIndex={20} position="relative">
      <Flex gap={2}>
        <Box flex={1} position="relative">
          <InputGroup size="sm">
            <InputLeftElement pointerEvents="none">
              <FaSearch color="gray" fontSize="12px" />
            </InputLeftElement>
            <Input
              ref={inputRef}
              placeholder={searchMode === 'station' ? 'Search station (e.g. "Sheffield")' : 'Search by headcode (e.g. "1F45")'}
              size="sm"
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              onKeyDown={onKeyDown}
              onFocus={() => { if (searchMode === 'station' && suggestions.length > 0) onShowSuggestionsChange(true); }}
              focusBorderColor="blue.500"
              bg="gray.50"
              pl="8"
              pr={searchTerm ? "8" : "3"}
              fontFamily={searchMode === 'train' ? "mono" : "inherit"}
              textTransform={searchMode === 'train' ? "uppercase" : "none"}
            />
            {/* clear button inside input */}
            {searchTerm && (
              <Box position="absolute" right="8px" top="50%" transform="translateY(-50%)"
                cursor="pointer" zIndex={2} onClick={onClear} color="gray.400"
                _hover={{ color: "gray.600" }} transition="color 0.15s"
              >
                <FaTimes fontSize="10px" />
              </Box>
            )}
          </InputGroup>

          {/* autocomplete dropdown */}
          {searchMode === 'station' && showSuggestions && (
            <Box ref={suggestionsRef} position="absolute" top="100%" left={0} right={0} mt={1}
              bg="white" border="1px solid" borderColor="gray.200" borderRadius="md"
              shadow="xl" zIndex={100} maxH="320px" overflowY="auto"
            >
              <Text fontSize="2xs" fontWeight="bold" color="gray.400" px={3} pt={2} pb={1}
                letterSpacing="wider" textTransform="uppercase">
                Matching Stations
              </Text>
              {suggestions.map((tiploc, index) => (
                <Flex key={tiploc.Tiploc} px={3} py={2} cursor="pointer" alignItems="center" gap={3}
                  bg={index === highlightedIndex ? "blue.50" : "transparent"}
                  _hover={{ bg: "blue.50" }} transition="background 0.1s"
                  onClick={() => onSuggestionSelect(tiploc)}
                >
                  <Box w="6px" h="6px" borderRadius="full" bg="blue.400" flexShrink={0} />
                  <Box flex={1} minW={0}>
                    <Text fontSize="sm" fontWeight="500" color="gray.700" isTruncated>{tiploc.Name}</Text>
                  </Box>
                  <Badge fontSize="0.6em" colorScheme="gray" variant="subtle" fontFamily="mono" px={1.5} borderRadius="sm" flexShrink={0}>
                    {tiploc.Tiploc}
                  </Badge>
                </Flex>
              ))}
            </Box>
          )}
        </Box>

        <Button size="sm" aria-label="Search for station or train" colorScheme="blue" onClick={onSearch} isLoading={isLoading} disabled={!searchTerm}>
          <FaSearch />
        </Button>
      </Flex>
    </Box>
  );
};

export default SearchBar;