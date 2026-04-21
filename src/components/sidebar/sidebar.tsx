import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, VStack, Text, Flex, Icon, HStack, useToast } from '@chakra-ui/react';
import { FaMapMarkerAlt } from 'react-icons/fa';
import { MdTrain } from 'react-icons/md';
import { trainApi } from '../../api/api';
import { ALL_TIPLOCS, HEADCODE_SEARCH_HUBS } from '../../data/tiplocData';
import type { Train, TiplocData } from '../../types';
import { DataSpinner } from '../spinners';
import SearchBar from './searchBar';
import TrainCard from './trainCard';

const MAX_SUGGESTIONS = 8; // autocomplete suggestions limit
const DEBOUNCE_MS = 250;   // debounce delay for autocomplete input
const HEADCODE_CHUNK_SIZE = 20;  // tiplocs per request, keeps URLs short
const HEADCODE_BATCH_SIZE = 2;   // concurrent chunk requests
const REFRESH_INTERVAL_MS = 30000; // auto-refresh station train list every 30s

// the two search modes available in the sidebar
type SearchMode = 'station' | 'train';

interface SidebarProps {
  trains: Train[];
  onTrainsChange: (trains: Train[]) => void;
  onLocationSelect: (lat: number, lng: number, stationCode: string) => void;
  onTrainSelect: (train: Train) => void;
  externalStation?: TiplocData | null; // set when user clicks a station on the map
}


/**
 * Performs fuzzy search across TIPLOC Name and Code fields.
 * Only returns passenger stations since those are the only ones the API
 * returns train data for. Signal boxes, carriage sheds, freight yards etc. are excluded.
 * Matches are scored: exact match > starts with > word boundary > contains.
 */
const PASSENGER_CATEGORIES = new Set([
  'InterchangePlanningLocation',
  'ThroughPlanningLocation',
  'StoppingOnly',
  'Interchange',
]);

const isPassengerStation = (t: TiplocData): boolean =>
  !!t.Details?.CRS &&
  !!t.Details?.TPS_StationCategory &&
  PASSENGER_CATEGORIES.has(t.Details.TPS_StationCategory);

const fuzzySearchTiplocs = (query: string): TiplocData[] => {
  if (query.length < 2) return [];

  const q = query.toLowerCase().trim();

  const scored = ALL_TIPLOCS
    .filter(t => t.Latitude && t.Longitude)
    .filter(t => !t.Tiploc.startsWith('ELOC'))
    .filter(isPassengerStation)
    .map(t => {
      const name = t.Name.toLowerCase();
      const code = t.Tiploc.toLowerCase();
      const crs = (t.Details?.CRS || '').toLowerCase();
      let score = 0;

      if (name === q || code === q || crs === q) score = 100;
      else if (name.startsWith(q)) score = 80;
      else if (code.startsWith(q)) score = 70;
      else if (name.split(/\s+/).some(word => word.startsWith(q))) score = 60;
      else if (name.includes(q)) score = 40;
      else if (code.includes(q)) score = 30;
      else return null;

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
  if (aExact !== bExact) return bExact - aExact;
  return (a.scheduledDeparture || '').localeCompare(b.scheduledDeparture || '');
};


// gets a safe message from an unknown error object
const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};


// main sidebar component
const Sidebar = ({ trains, onTrainsChange, onLocationSelect, onTrainSelect, externalStation }: SidebarProps) => {

  // shared state
  const [searchMode, setSearchMode] = useState<SearchMode>('station');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTrainId, setSelectedTrainId] = useState<string | null>(null);

  // station search state
  const [activeStation, setActiveStation] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<TiplocData[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const [searchedHeadcode, setSearchedHeadcode] = useState<string | null>(null);

  // refs
  const searchGenRef = useRef(0);
  const activeTiplocRef = useRef<string | null>(null);

  const toast = useToast();


  // auto-refresh: periodically re-fetch the station train list to keep statuses current
  useEffect(() => {
    const interval = setInterval(async () => {
      const tiploc = activeTiplocRef.current;
      if (!tiploc) return;

      try {
        const fresh = await trainApi.getTrainsAtStation(tiploc);
        onTrainsChange(fresh);
      } catch {
        // silent fail, keep existing data and retry
      }
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [onTrainsChange]);


  // switches between station and train search modes
  const handleModeSwitch = (mode: SearchMode) => {
    if (mode === searchMode) return;
    searchGenRef.current++;
    activeTiplocRef.current = null;
    setSearchMode(mode);
    setSearchTerm('');
    onTrainsChange([]);
    setSelectedTrainId(null);
    setActiveStation(null);
    setSearchedHeadcode(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };


  // debounced autocomplete: updates suggestion list as user types
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


  // handle search for station and its schedule
  const executeStationSearch = useCallback(async (tiplocCode: string, stationName?: string) => {
    const gen = ++searchGenRef.current;

    setIsLoading(true);
    onTrainsChange([]);
    setSelectedTrainId(null);
    setShowSuggestions(false);
    setActiveStation(stationName || tiplocCode);

    try {
      let lat: number | null = null;
      let lng: number | null = null;

      try {
        const location = await trainApi.getLocation(tiplocCode);
        if (gen !== searchGenRef.current) return;
        lat = location.latitude;
        lng = location.longitude;
      } catch {
        const localMatch = ALL_TIPLOCS.find(t => t.Tiploc === tiplocCode.toUpperCase());
        if (localMatch?.Latitude && localMatch?.Longitude) {
          lat = localMatch.Latitude;
          lng = localMatch.Longitude;
        }
      }

      if (gen !== searchGenRef.current) return;
      if (lat === null || lng === null) {
        throw new Error(`Could not find coordinates for: ${tiplocCode}`);
      }

      onLocationSelect(lat, lng, tiplocCode.toUpperCase());
      activeTiplocRef.current = tiplocCode.toUpperCase();

      try {
        const schedule = await trainApi.getTrainsAtStation(tiplocCode);
        if (gen !== searchGenRef.current) return;
        onTrainsChange(schedule);
      } catch {
        if (gen !== searchGenRef.current) return;
        onTrainsChange([]);
      }

    } catch (error: unknown) {
      if (gen !== searchGenRef.current) return;
      toast({
        title: "Search failed",
        description: getErrorMessage(error, "Could not find station."),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      if (gen === searchGenRef.current) {
        setIsLoading(false);
      }
    }
  }, [onLocationSelect, onTrainsChange, toast]);


  // handles selection of an autocomplete suggestion
  const handleSuggestionSelect = (tiploc: TiplocData) => {
    setSearchTerm(tiploc.Name);
    setShowSuggestions(false);
    executeStationSearch(tiploc.Tiploc, tiploc.Name);
  };


  // executes nationwide headcode search by scanning major UK rail hubs
  const executeTrainSearch = useCallback(async (headcode: string) => {
    const gen = ++searchGenRef.current;
    activeTiplocRef.current = null;
    setIsLoading(true);
    onTrainsChange([]);
    setSelectedTrainId(null);
    setSearchedHeadcode(headcode.toUpperCase());

    try {
      const hc = headcode.toUpperCase();
      const hubChunks = chunkArray(HEADCODE_SEARCH_HUBS, HEADCODE_CHUNK_SIZE);
      const matchesById = new Map<string, Train>();

      for (let i = 0; i < hubChunks.length; i += HEADCODE_BATCH_SIZE) {
        if (gen !== searchGenRef.current) return;

        const batch = hubChunks.slice(i, i + HEADCODE_BATCH_SIZE);
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

      if (gen !== searchGenRef.current) return;

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

      onTrainsChange(matches);

      if (matches.length === 1) {
        const train = matches[0];
        setSelectedTrainId(train.trainId);
        onTrainSelect(train);
      }

    } catch (error: unknown) {
      if (gen !== searchGenRef.current) return;
      toast({
        title: "Search failed",
        description: getErrorMessage(error, "Could not search for train."),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      if (gen === searchGenRef.current) {
        setIsLoading(false);
      }
    }
  }, [onTrainSelect, onTrainsChange, toast]);


  // reacts to station clicks on the map
  const lastExternalTiplocRef = useRef<string | null>(null);

  useEffect(() => {
    if (!externalStation) return;
    if (externalStation.Tiploc === lastExternalTiplocRef.current) return;

    lastExternalTiplocRef.current = externalStation.Tiploc;

    setSearchMode('station');
    setSearchTerm(externalStation.Name);
    setSearchedHeadcode(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setHighlightedIndex(-1);

    executeStationSearch(externalStation.Tiploc, externalStation.Name);
  }, [externalStation, executeStationSearch]);


  // unified search handler
  const handleSearch = () => {
    if (!searchTerm.trim()) return;

    if (searchMode === 'train') {
      executeTrainSearch(searchTerm.trim());
      return;
    }

    const term = searchTerm.trim().toLowerCase();

    const directMatch = ALL_TIPLOCS.find(
      t => t.Tiploc.toLowerCase() === term && isPassengerStation(t)
    ) || ALL_TIPLOCS.find(
      t => t.Tiploc.toLowerCase() === term
    );
    if (directMatch) {
      executeStationSearch(directMatch.Tiploc, directMatch.Name);
      return;
    }

    const nameMatch = ALL_TIPLOCS.find(
      t => t.Name.toLowerCase() === term && isPassengerStation(t)
    ) || ALL_TIPLOCS.find(
      t => t.Name.toLowerCase() === term
    );
    if (nameMatch) {
      executeStationSearch(nameMatch.Tiploc, nameMatch.Name);
      return;
    }

    if (suggestions.length > 0) {
      handleSuggestionSelect(suggestions[0]);
      return;
    }

    executeStationSearch(searchTerm.trim().toUpperCase());
  };


  // keyboard navigation for autocomplete and enter-to-search
  const handleKeyDown = (e: React.KeyboardEvent) => {
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
    searchGenRef.current++;
    activeTiplocRef.current = null;
    setSearchTerm('');
    setSuggestions([]);
    setShowSuggestions(false);
    onTrainsChange([]);
    setSelectedTrainId(null);
    setActiveStation(null);
    setSearchedHeadcode(null);
    lastExternalTiplocRef.current = null;
  };


  return (
    <Box h="full" display="flex" flexDirection="column" bg="white" maxW={{ base: "unset", md: "400px" }} borderRight={{ base: "0", md: "1px" }} borderColor="gray.200">

      {/* search mode tabs */}
      <Flex borderBottomWidth="1px" borderColor="gray.200" bg="white">
        <SearchTab label="Station" icon={FaMapMarkerAlt} isActive={searchMode === 'station'} onClick={() => handleModeSwitch('station')} />
        <SearchTab label="Train" icon={MdTrain} isActive={searchMode === 'train'} onClick={() => handleModeSwitch('train')} />
      </Flex>

      {/* search bar */}
      <SearchBar
        searchMode={searchMode}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onSearch={handleSearch}
        onClear={handleClear}
        onKeyDown={handleKeyDown}
        isLoading={isLoading}
        suggestions={suggestions}
        showSuggestions={showSuggestions}
        onShowSuggestionsChange={setShowSuggestions}
        highlightedIndex={highlightedIndex}
        onSuggestionSelect={handleSuggestionSelect}
      />

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

      {/* train list */}
      <VStack flex="1" overflowY="auto" p="3" spacing="3" align="stretch" bg="gray.50">
        {isLoading && (
          <DataSpinner />
        )}

        {!isLoading && trains.map((train) => (
          <TrainCard
            key={train.trainId}
            train={train}
            isSelected={selectedTrainId === train.trainId}
            onSelect={() => {
              setSelectedTrainId(train.trainId);
              onTrainSelect(train);
            }}
          />
        ))}

        {!isLoading && trains.length === 0 && (
          <Flex direction="column" align="center" justify="center" py={12} color="gray.600" mt={10}>
            <Icon as={searchMode === 'station' ? FaMapMarkerAlt : MdTrain} boxSize={12} mb={4} opacity={0.2} />
            <Text fontSize="md" fontWeight="medium" textAlign="center" color="gray.700" mb={1}>
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
