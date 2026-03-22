import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, VStack, Input, Text, Button, useToast, Card, CardBody, Badge, Flex, Spinner, HStack, Icon,
  InputGroup, InputLeftElement
} from '@chakra-ui/react';
import { FaSearch, FaCircle, FaTimes, FaMapMarkerAlt } from 'react-icons/fa';
import { MdTrain } from 'react-icons/md';
import { trainApi } from '../../api/api';
import { ALL_TIPLOCS, SEARCHABLE_STATION_TIPLOCS } from '../../data/tiplocData';
import { getTrainStatus, formatTime } from '../../utils/trainUtils';
import type { Train, TiplocData } from '../../types';

const MAX_SUGGESTIONS = 8; // autocomplete suggestions limit
const DEBOUNCE_MS = 250;   // debounce delay for autocomplete input
const HEADCODE_CHUNK_SIZE = 75; // tiploc chunk size for nationwide headcode search
const HEADCODE_BATCH_SIZE = 4;  // concurrent chunk requests during headcode search

// the two search modes available in the sidebar
type SearchMode = 'station' | 'train';


interface SidebarProps {
  onLocationSelect: (lat: number, lng: number, stationCode: string) => void;
  onTrainSelect: (train: Train) => void;
}


/**
 * Performs fuzzy search across TIPLOC Name and Code fields.
 * Matches are scored: exact match > starts with > word boundary > contains.
 * Passenger stations (with CRS codes) are boosted in ranking.
 */
const fuzzySearchTiplocs = (query: string): TiplocData[] => {
  if (query.length < 2) return [];

  const q = query.toLowerCase().trim();

  const scored = ALL_TIPLOCS
    .filter(t => t.Latitude && t.Longitude)               // only entries with valid coordinates
    .filter(t => !t.Tiploc.startsWith('ELOC'))            // exclude engineering locations
    .map(t => {
      const name = t.Name.toLowerCase();
      const code = t.Tiploc.toLowerCase();
      let score = 0;

      // exact match on either field gets highest score
      if (name === q || code === q) score = 100;
      // starts-with match is next best
      else if (name.startsWith(q)) score = 80;
      else if (code.startsWith(q)) score = 70;
      // word boundary match (e.g. "pancras" matches "london st pancras")
      else if (name.split(/\s+/).some(word => word.startsWith(q))) score = 60;
      // contains match
      else if (name.includes(q)) score = 40;
      else if (code.includes(q)) score = 30;
      // no match
      else return null;

      // boost real passenger stations with CRS codes
      if (t.Details?.CRS) score += 10;

      return { tiploc: t, score };
    })
    .filter((item): item is { tiploc: TiplocData; score: number } => item !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SUGGESTIONS)
    .map(item => item.tiploc);

  return scored;
};


// splits a large list into smaller arrays for batched API requests
const chunkArray = <T,>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
};


// sorts train results so exact headcode matches appear first, then by departure time
const sortHeadcodeResults = (a: Train, b: Train, headcode: string) => {
  const aExact = a.headCode?.toUpperCase() === headcode ? 1 : 0;
  const bExact = b.headCode?.toUpperCase() === headcode ? 1 : 0;

  if (aExact !== bExact) {
    return bExact - aExact;
  }

  return (a.scheduledDeparture || '').localeCompare(b.scheduledDeparture || '');
};


// gets a safe message from an unknown error object
const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};


// main sidebar component
const Sidebar = ({ onLocationSelect, onTrainSelect }: SidebarProps) => {

  // shared state
  const [searchMode, setSearchMode] = useState<SearchMode>('station');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [trains, setTrains] = useState<Train[]>([]);
  const [selectedTrainId, setSelectedTrainId] = useState<string | null>(null);

  // station search state
  const [activeStation, setActiveStation] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<TiplocData[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const [searchedHeadcode, setSearchedHeadcode] = useState<string | null>(null);

  // refs
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const toast = useToast();


  /**
   * Switches between station and train search modes.
   * Clears all previous search results and input when switching.
   */
  const handleModeSwitch = (mode: SearchMode) => {
    if (mode === searchMode) return;
    setSearchMode(mode);
    setSearchTerm('');
    setTrains([]);
    setSelectedTrainId(null);
    setActiveStation(null);
    setSearchedHeadcode(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };


  /**
   * Debounced autocomplete: updates suggestion list as user types.
   * Only active in station search mode.
   */
  useEffect(() => {
    if (searchMode !== 'station' || searchTerm.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(() => {
      const results = fuzzySearchTiplocs(searchTerm);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setHighlightedIndex(-1);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchTerm, searchMode]);


  // close suggestions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  // handle search for station and its schedule
  const executeStationSearch = useCallback(async (tiplocCode: string, stationName?: string) => {
    setIsLoading(true);       // show loading spinner
    setTrains([]);            // clear previous search results
    setSelectedTrainId(null); // clear selected train
    setShowSuggestions(false);
    setActiveStation(stationName || tiplocCode);

    try {
      // get coordinates: try API first, fall back to local JSON data
      let lat: number | null = null;
      let lng: number | null = null;

      try { // fetch location data for the searched tiploc
        const location = await trainApi.getLocation(tiplocCode);
        lat = location.latitude;
        lng = location.longitude;
      } catch {
        // API failed — fall back to local JSON data for coordinates
        const localMatch = ALL_TIPLOCS.find(t => t.Tiploc === tiplocCode.toUpperCase());
        if (localMatch?.Latitude && localMatch?.Longitude) {
          lat = localMatch.Latitude;
          lng = localMatch.Longitude;
        }
      }

      if (lat === null || lng === null) {
        throw new Error(`Could not find coordinates for: ${tiplocCode}`);
      }

      onLocationSelect(lat, lng, tiplocCode.toUpperCase());

      // fetch train schedule (may return empty on staging API)
      try {
        const schedule = await trainApi.getTrainsAtStation(tiplocCode);
        setTrains(schedule);
      } catch {
        setTrains([]);
      }

    } catch (error: unknown) {
      toast({ // custom error toast
        title: "Search failed",
        description: getErrorMessage(error, "Could not find station."),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [onLocationSelect, toast]);


  /**
   * Handles selection of an autocomplete suggestion.
   * Updates input field and triggers the station search.
   */
  const handleSuggestionSelect = (tiploc: TiplocData) => {
    setSearchTerm(tiploc.Name);
    setShowSuggestions(false);
    executeStationSearch(tiploc.Tiploc, tiploc.Name);
  };


  /**
   * Executes nationwide headcode search by scanning batched passenger-station TIPLOCs.
   * Results are deduplicated by train id and sorted with exact matches first.
   */
  const executeTrainSearch = useCallback(async (headcode: string) => {
    setIsLoading(true);
    setTrains([]);
    setSelectedTrainId(null);
    setSearchedHeadcode(headcode.toUpperCase());

    try {
      const hc = headcode.toUpperCase();
      const stationChunks = chunkArray(SEARCHABLE_STATION_TIPLOCS, HEADCODE_CHUNK_SIZE);
      const matchesById = new Map<string, Train>();

      for (let i = 0; i < stationChunks.length; i += HEADCODE_BATCH_SIZE) {
        const batch = stationChunks.slice(i, i + HEADCODE_BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(chunk => trainApi.getTrainsAtTiplocs(chunk))
        );

        results.forEach((result) => {
          if (result.status !== 'fulfilled') return;

          result.value.forEach((train) => {
            if (!train.headCode?.toUpperCase().includes(hc)) return;
            if (!matchesById.has(train.trainId)) {
              matchesById.set(train.trainId, train);
            }
          });
        });
      }

      const matches = Array.from(matchesById.values()).sort((a, b) => sortHeadcodeResults(a, b, hc));

      if (matches.length === 0) {
        toast({
          title: "No trains found",
          description: `No trains with headcode "${hc}" today.`,
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
      }

      setTrains(matches);

      // auto-select if exactly one result
      if (matches.length === 1) {
        const train = matches[0];
        setSelectedTrainId(train.trainId);
        onTrainSelect(train);
      }

    } catch (error: unknown) {
      toast({
        title: "Search failed",
        description: getErrorMessage(error, "Could not search for train."),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [onTrainSelect, toast]);


  // unified search handler
  const handleSearch = () => {
    if (!searchTerm.trim()) return;

    if (searchMode === 'train') {
      executeTrainSearch(searchTerm.trim());
      return;
    }

    // station mode: try to resolve the input to a TIPLOC
    const directMatch = ALL_TIPLOCS.find(
      t => t.Tiploc.toLowerCase() === searchTerm.trim().toLowerCase()
    );
    if (directMatch) {
      executeStationSearch(directMatch.Tiploc, directMatch.Name);
      return;
    }

    const nameMatch = ALL_TIPLOCS.find(
      t => t.Name.toLowerCase() === searchTerm.trim().toLowerCase()
    );
    if (nameMatch) {
      executeStationSearch(nameMatch.Tiploc, nameMatch.Name);
      return;
    }

    // use first autocomplete suggestion if available
    if (suggestions.length > 0) {
      handleSuggestionSelect(suggestions[0]);
      return;
    }

    // fallback: try direct API lookup with raw input
    executeStationSearch(searchTerm.trim().toUpperCase());
  };


  // quality of life feature - allow pressing Enter to trigger search
  // also handles keyboard navigation for autocomplete dropdown
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // station mode with suggestions open: arrow key navigation
    if (searchMode === 'station' && showSuggestions) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex(prev => prev < suggestions.length - 1 ? prev + 1 : 0);
          return;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex(prev => prev > 0 ? prev - 1 : suggestions.length - 1);
          return;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
            handleSuggestionSelect(suggestions[highlightedIndex]);
          } else {
            handleSearch();
          }
          return;
        case 'Escape':
          setShowSuggestions(false);
          return;
      }
    }

    if (e.key === 'Enter') handleSearch();
  };


  // clear search and reset all state
  const handleClear = () => {
    setSearchTerm('');
    setSuggestions([]);
    setShowSuggestions(false);
    setTrains([]);
    setSelectedTrainId(null);
    setActiveStation(null);
    setSearchedHeadcode(null);
  };


  return (
    <Box h="full" display="flex" flexDirection="column" bg="white" borderRight="1px" borderColor="gray.200">

      {/* search mode tabs */}
      <Flex borderBottomWidth="1px" borderColor="gray.200" bg="white">
        <SearchTab label="Station" icon={FaMapMarkerAlt} isActive={searchMode === 'station'} onClick={() => handleModeSwitch('station')} />
        <SearchTab label="Train" icon={MdTrain} isActive={searchMode === 'train'} onClick={() => handleModeSwitch('train')} />
      </Flex>

      {/* search area */}
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
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => { if (searchMode === 'station' && suggestions.length > 0) setShowSuggestions(true); }}
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
                  cursor="pointer" zIndex={2} onClick={handleClear} color="gray.400"
                  _hover={{ color: "gray.600" }} transition="color 0.15s"
                >
                  <FaTimes fontSize="10px" />
                </Box>
              )}
            </InputGroup>

            {/* auto complete dropdown */}
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
                    onClick={() => handleSuggestionSelect(tiploc)}
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

          <Button size="sm" colorScheme="blue" onClick={handleSearch} isLoading={isLoading} disabled={!searchTerm}>
            <FaSearch />
          </Button>
        </Flex>
      </Box>

      {/* results context */}
      {!isLoading && trains.length > 0 && (
        <Box px={4} py={2} borderBottomWidth="1px" borderColor="gray.100" bg="gray.50">
          <Text fontSize="xs" fontWeight="bold" color="gray.500">
            {searchMode === 'station' ? (
              <>{trains.length} train{trains.length !== 1 ? 's' : ''} at <Text as="span" color="blue.600">{activeStation}</Text></>
            ) : (
              <>{trains.length} result{trains.length !== 1 ? 's' : ''} for headcode <Text as="span" color="blue.600" fontFamily="mono">{searchedHeadcode}</Text></>
            )}
          </Text>
        </Box>
      )}

      <VStack flex="1" overflowY="auto" p="3" spacing="3" align="stretch" bg="gray.50">
        {isLoading && (
          <Flex justify="center" py={8}>
            <Spinner color="blue.500" size="xl" thickness="3px" />
          </Flex>
        )}

        {!isLoading && trains.map((train) => {
          const status = getTrainStatus(train);
          const isSelected = selectedTrainId === train.trainId;
          const isLate = train.lastReportedDelay > 4 && !train.cancelled;

          return (
            <Card
              key={train.trainId}
              h="auto"
              minH="fit-content"
              cursor="pointer"
              onClick={() => {
                setSelectedTrainId(train.trainId);
                onTrainSelect(train);
              }}
              bg={isSelected ? "blue.50" : "white"}
              borderColor={isSelected ? "blue.400" : "gray.200"}
              borderWidth="1px"
              _hover={{ shadow: "md", borderColor: isSelected ? "blue.400" : "blue.200" }}
              transition="all 0.2s"
              overflow="hidden"
            >
              <Box h="3px" w="full" bg={status.color} />

              <CardBody py={3} px={3}>
                <Flex justify="space-between" align="center" mb={3}>
                  <HStack spacing={2}>
                    <Icon as={MdTrain} color="gray.600" />
                    <Text fontWeight="bold" fontSize="sm" color="gray.700">
                      {train.headCode}
                    </Text>
                  </HStack>
                  <Badge colorScheme={status.badgeScheme} variant="subtle" fontSize="0.65em" px={2} py={0.5} borderRadius="sm">
                    {status.label}
                  </Badge>
                </Flex>

                <Box position="relative" pl={2} mb={3}>
                  <Box position="absolute" left="11px" top="10px" bottom="10px" w="2px" bg="gray.200" />

                  <VStack align="stretch" spacing={3}>
                    <Flex align="center" gap={3}>
                      <Icon as={FaCircle} color="gray.400" boxSize={2} zIndex={1} />
                      <Text fontSize="sm" fontWeight="semibold" w="45px" color={isLate ? "red.500" : "gray.700"}>
                        {formatTime(train.scheduledDeparture)}
                      </Text>
                      <Text fontSize="xs" fontWeight="medium" color="gray.600" isTruncated>
                        {train.originLocation || train.originTiploc}
                      </Text>
                    </Flex>

                    <Flex align="center" gap={3}>
                      <Icon as={FaCircle} color={status.color} boxSize={2} zIndex={1} />
                      <Text fontSize="sm" fontWeight="semibold" w="45px" color={isLate ? "red.500" : "gray.700"}>
                        {formatTime(train.scheduledArrival)}
                      </Text>
                      <Text fontSize="sm" fontWeight="bold" color="gray.800" isTruncated>
                        {train.destinationLocation || train.destinationTiploc}
                      </Text>
                    </Flex>
                  </VStack>
                </Box>

                <Flex justify="space-between" align="center" borderTopWidth="1px" borderColor="gray.100" pt={2}>
                  <Text fontSize="2xs" color="gray.500" fontWeight="medium" textTransform="uppercase" letterSpacing="wide">
                    {train.toc_Name || "Operator Unknown"}
                  </Text>
                </Flex>

              </CardBody>
            </Card>
          );
        })}

        {!isLoading && trains.length === 0 && (
          <Flex direction="column" align="center" justify="center" py={12} color="gray.400" mt={10}>
            <Icon as={searchMode === 'station' ? FaMapMarkerAlt : MdTrain} boxSize={12} mb={4} opacity={0.2} />
            <Text fontSize="md" fontWeight="medium" textAlign="center" color="gray.500" mb={1}>
              {!searchTerm
                ? (searchMode === 'station' ? "Search for a station" : "Search for a train")
                : "No active trains found"}
            </Text>
            <Text fontSize="sm" textAlign="center" px={6}>
              {!searchTerm
                ? (searchMode === 'station'
                  ? 'Type a station name (e.g. "Sheffield", "Euston")'
                  : 'Enter a train headcode (e.g. "1F45")')
                : (searchMode === 'station'
                  ? "We couldn't find any schedule for this TIPLOC. Please try another."
                  : "No trains found with this headcode today.")}
            </Text>
          </Flex>
        )}

      </VStack>
    </Box>
  );
};


// search tab button
const SearchTab = ({ label, icon, isActive, onClick }: { label: string; icon: React.ElementType; isActive: boolean; onClick: () => void }) => (
  <Box flex={1} py={2.5} textAlign="center" cursor="pointer" onClick={onClick}
    borderBottomWidth="2px" borderBottomColor={isActive ? "blue.500" : "transparent"}
    bg={isActive ? "blue.50" : "transparent"} transition="all 0.15s"
    _hover={{ bg: isActive ? "blue.50" : "gray.50" }}
  >
    <HStack spacing={2} justify="center">
      <Icon as={icon} boxSize={3.5} color={isActive ? "blue.600" : "gray.400"} />
      <Text fontSize="xs" fontWeight="700" letterSpacing="wider" textTransform="uppercase" color={isActive ? "blue.600" : "gray.500"}>
        {label}
      </Text>
    </HStack>
  </Box>
);

export default Sidebar;
