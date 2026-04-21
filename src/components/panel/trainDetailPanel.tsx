import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Text, Flex, Badge, Icon, IconButton, useBreakpointValue,
  Tabs, TabList, Tab, TabPanels, TabPanel, VStack, HStack
} from '@chakra-ui/react';
import { FaTimes, FaClock, FaSyncAlt, FaArrowLeft } from 'react-icons/fa';
import { MdTrain, MdArrowForward } from 'react-icons/md';
import { trainApi } from '../../api/api';
import { getTiplocName } from '../../data/tiplocData';
import { getTrainStatus } from '../../utils/trainUtils';
import type { Train, TimelineStop, ScheduleStop, MovementEvent } from '../../types';
import type { LiveTrackingStatus } from '../../hooks/useLiveSelectedTrain';
import { DataSpinner } from '../spinners';
import TimelineItem from './timelineItem';


interface TrainDetailPanelProps {
  train: Train;
  liveStatus: LiveTrackingStatus;
  lastUpdated: Date | null;
  onLastUpdatedChange: (value: Date) => void;
  onClose: () => void;
}


/* builds the timeline by merging schedule stops with movement events
   schedule gives us: ordered route, tiplocs, lat/lng, planned times
   movement gives us: actual times and variation (delay) at each location
*/
export const buildTimeline = (
  schedule: ScheduleStop[],
  movements: MovementEvent[],
  train: Train
): TimelineStop[] => {

  // if schedule API returned nothing, build a minimal origin→destination fallback
  if (schedule.length === 0) {
    return [
      {
        tiploc: train.originTiploc,
        name: train.originLocation || getTiplocName(train.originTiploc),
        latitude: 0,
        longitude: 0,
        scheduledTime: train.scheduledDeparture,
        actualTime: train.actualDeparture || null,
        variation: null,
        eventType: "departure",
        isPass: false,
      },
      {
        tiploc: train.destinationTiploc,
        name: train.destinationLocation || getTiplocName(train.destinationTiploc),
        latitude: 0,
        longitude: 0,
        scheduledTime: train.scheduledArrival,
        actualTime: train.actualArrival || null,
        variation: null,
        eventType: "arrival",
        isPass: false,
      }
    ];
  }

  // index movement events by location name (uppercased) for fast lookup
  const movementMap = new Map<string, MovementEvent>();
  for (const m of movements) {
    movementMap.set(m.location.toUpperCase(), m);
  }

  // map each schedule stop to a timeline entry, enriching with movement data where available
  return schedule.map((stop) => {
    const isPass = !!stop.pass;
    const eventType = stop.departure ? "departure" : stop.arrival ? "arrival" : "pass";
    const scheduledTime = stop.departure || stop.arrival || stop.pass || null;

    // try to match this stop to a movement event by location name
    const movement = movementMap.get(stop.location.toUpperCase());

    return {
      tiploc: stop.tiploc,
      name: stop.location,
      latitude: stop.latLong?.latitude || 0,
      longitude: stop.latLong?.longitude || 0,
      scheduledTime,
      actualTime: movement?.actual || null,
      variation: movement?.variation ?? null,
      eventType,
      isPass,
    };
  });
};


// gets a safe message from an unknown error object
const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};


// returns a small live badge config for the current socket status
const getLiveBadge = (status: LiveTrackingStatus) => {
  switch (status) {
    case 'live':
      return { scheme: 'green', label: 'LIVE' };
    case 'connecting':
      return { scheme: 'blue', label: 'CONNECTING' };
    case 'reconnecting':
      return { scheme: 'orange', label: 'RECONNECTING' };
    case 'disconnected':
      return { scheme: 'red', label: 'DISCONNECTED' };
    case 'unavailable':
      return { scheme: 'gray', label: 'LIVE UNAVAILABLE' };
    case 'error':
      return { scheme: 'red', label: 'LIVE ERROR' };
    default:
      return { scheme: 'gray', label: 'IDLE' };
  }
};


// formats a Date object to a readable time string for the "last updated" display
const formatLastUpdated = (date: Date | null): string => {
  if (!date) return 'Not yet updated';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};


// main train detail panel component
const TrainDetailPanel = ({ train, liveStatus, lastUpdated, onLastUpdatedChange, onClose }: TrainDetailPanelProps) => {

  const [timeline, setTimeline] = useState<TimelineStop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scheduleRef = useRef<ScheduleStop[]>([]);
  const prevLocationRef = useRef<string | undefined>(train.lastReportedLocation);
  const status = getTrainStatus(train);
  const liveBadge = getLiveBadge(liveStatus);
  const isMobile = useBreakpointValue({ base: true, md: false });

  // fetches both schedule and movement data, rebuilds timeline
  const fetchFullData = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const [schedule, movements] = await Promise.all([
        trainApi.getTrainSchedule(train.activationId, train.scheduleId),
        trainApi.getTrainMovement(train.activationId, train.scheduleId).catch(
          () => [] as MovementEvent[]
        ),
      ]);

      scheduleRef.current = schedule;

      const built = buildTimeline(schedule, movements, train);
      setTimeline(built);
      onLastUpdatedChange(new Date());
    } catch (err: unknown) {
      console.warn('[Velociti Detail] Failed to fetch journey data:', err);
      setError(getErrorMessage(err, 'Failed to load journey details'));

      if (scheduleRef.current.length === 0) {
        setTimeline(buildTimeline([], [], train));
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [train.activationId, train.scheduleId, onLastUpdatedChange]);


  // fetches only movement data and merges with cached schedule, used for live updates
  const refreshMovements = useCallback(async () => {
    // skip if we don't have a cached schedule yet
    if (scheduleRef.current.length === 0) return;

    try {
      const movements = await trainApi.getTrainMovement(train.activationId, train.scheduleId);
      const built = buildTimeline(scheduleRef.current, movements, train);
      setTimeline(built);
      onLastUpdatedChange(new Date());
    } catch {
      // movement refresh failed silently
    }
  }, [train.activationId, train.scheduleId, onLastUpdatedChange]);


  // initial load when a different train is selected (keyed on activation/schedule IDs)
  useEffect(() => {
    scheduleRef.current = [];
    prevLocationRef.current = train.lastReportedLocation;
    fetchFullData(true);
  }, [train.activationId, train.scheduleId]);


  // live update detection: when lastReportedLocation changes, re-fetch movements only
  // this avoids hammering the schedule endpoint on every socket tick
  useEffect(() => {
    const currentLocation = train.lastReportedLocation;

    if (currentLocation && currentLocation !== prevLocationRef.current) {
      prevLocationRef.current = currentLocation;
      refreshMovements();
    }
  }, [train.lastReportedLocation, refreshMovements]);


  // manual refresh handler
  const handleManualRefresh = () => {
    fetchFullData(false);
  };


  return (
    <Box
      w={{ base: "full", md: "380px" }}
      minW={{ base: "unset", md: "320px" }}
      maxW={{ base: "unset", md: "430px" }}
      h="full"
      bg="white"
      borderLeftWidth={{ base: "0", md: "1px" }}
      borderColor="gray.200"
      shadow={{ base: "none", md: "xl" }}
      display="flex"
      flexDirection="column"
      zIndex={10}
    >
      {/* mobile back button */}
      {isMobile && (
        <Flex
          px={3} py={2}
          align="center"
          gap={2}
          borderBottomWidth="1px"
          borderColor="gray.100"
          bg="gray.50"
          flexShrink={0}
          cursor="pointer"
          onClick={onClose}
          _active={{ bg: "gray.100" }}
        >
          <Icon as={FaArrowLeft} color="blue.500" boxSize={3} />
          <Text fontSize="sm" fontWeight="600" color="blue.500">
            Back to search
          </Text>
        </Flex>
      )}

      {/* panel header */}
      <Box p={{ base: 3, md: 4 }} borderBottomWidth="1px" borderColor="gray.200" bg="white">
        <Flex justify="space-between" align="flex-start">
          <Box>
            {/* headcode and operator */}
            <HStack spacing={2} mb={1}>
              <Icon as={MdTrain} color="blue.600" boxSize={5} />
              <Text fontWeight="bold" fontSize="xl" color="gray.800" fontFamily="mono">
                {train.headCode}
              </Text>
              <Badge colorScheme={status.badgeScheme} variant="subtle" fontSize="0.65em" px={2}>
                {status.label}
              </Badge>
              <Badge colorScheme={liveBadge.scheme} variant="subtle" fontSize="0.65em" px={2}>
                {liveBadge.label}
              </Badge>
            </HStack>

            <Text fontSize="xs" color="blue.600" fontWeight="600" mb={2}>
              {train.toc_Name || "Operator Unknown"}
            </Text>

            {/* origin -> destination summary */}
            <HStack spacing={2} fontSize="sm" color="gray.600">
              <Text fontWeight="500" isTruncated maxW="120px">
                {train.originLocation || train.originTiploc}
              </Text>
              <Icon as={MdArrowForward} color="gray.400" />
              <Text fontWeight="600" color="gray.800" isTruncated maxW="120px">
                {train.destinationLocation || train.destinationTiploc}
              </Text>
            </HStack>

            {/* delay indicator */}
            {train.lastReportedDelay > 0 && !train.cancelled && (
              <HStack mt={1} spacing={1}>
                <Icon as={FaClock} color="orange.400" boxSize={3} />
                <Text fontSize="xs" color="orange.500" fontWeight="600">
                  {train.lastReportedDelay} min{train.lastReportedDelay !== 1 ? 's' : ''} late
                </Text>
              </HStack>
            )}
          </Box>

          {!isMobile && (
            <IconButton
              aria-label="Close panel"
              icon={<FaTimes />}
              variant="ghost"
              size="sm"
              color="gray.400"
              _hover={{ color: "gray.600", bg: "gray.100" }}
              onClick={onClose}
            />
          )}
        </Flex>
      </Box>

      {/* live info bar with last updated timestamp and manual refresh */}
      <Box px={4} py={2} borderBottomWidth="1px" borderColor="gray.100" bg="gray.50" flexShrink={0}>
        <Flex justify="space-between" align="center" gap={2}>
          <Box flex={1} minW={0}>
            {/* latest reported location and delay */}
            {train.lastReportedLocation && (
              <Text fontSize="xs" color="gray.600" isTruncated mb={0.5}>
                <Text as="span" fontWeight="600">{train.lastReportedLocation}</Text>
                {' · '}
                <Text as="span" color={train.lastReportedDelay > 0 ? "orange.500" : "green.500"} fontWeight="600">
                  {train.lastReportedDelay > 0
                    ? `${train.lastReportedDelay} min${train.lastReportedDelay !== 1 ? 's' : ''} late`
                    : 'On time'}
                </Text>
              </Text>
            )}

            {/* last updated timestamp */}
            <HStack spacing={1.5}>
              <Icon as={FaClock} color="gray.400" boxSize={2.5} />
              <Text fontSize="2xs" color="gray.400">
                Updated: <Text as="span" fontWeight="600" color="gray.500">{formatLastUpdated(lastUpdated)}</Text>
              </Text>
            </HStack>
          </Box>

          <IconButton
            aria-label="Refresh train data"
            size="xs"
            colorScheme="blue"
            variant="outline"
            icon={<FaSyncAlt />}
            isLoading={isRefreshing}
            onClick={handleManualRefresh}
            flexShrink={0}
          />
        </Flex>
      </Box>

      {/* tabs (right now we only have progress tab, open for more) */}
      <Tabs variant="enclosed" size="sm" colorScheme="blue" flex={1} display="flex" flexDirection="column" minH="0">
        <TabList borderBottomWidth="1px" borderColor="gray.200" bg="gray.50">
          <Tab fontWeight="600" fontSize="xs" _selected={{ bg: "white", color: "blue.600", borderBottomColor: "white" }}>
            Progress
          </Tab>
        </TabList>

        <TabPanels flex={1} overflow="hidden">
          {/* progress tab */}
          <TabPanel p={0} h="full" overflow="hidden" display="flex" flexDirection="column">
            <Flex px={4} py={2} borderBottomWidth="1px" borderColor="gray.100" bg="gray.50" justify="space-between" align="center">
              <Text fontSize="xs" fontWeight="600" color="gray.600">
                {train.originLocation || train.originTiploc} → {train.destinationLocation || train.destinationTiploc}
              </Text>
              {timeline.length > 2 && (
                <Text fontSize="xs" color="gray.700">{timeline.length} stops</Text>
              )}
            </Flex>

            {/* error message */}
            {error && (
              <Box px={4} py={2} bg="orange.50">
                <Text fontSize="xs" color="orange.600">{error}</Text>
              </Box>
            )}

            {isLoading ? (
              <DataSpinner />
            ) : (
              <Box flex={1} overflowY="auto" py={2} minH="0">
                <VStack spacing={0} align="stretch">
                  {timeline.map((stop, index) => (
                    <TimelineItem
                      key={`${stop.tiploc}-${index}`}
                      stop={stop}
                      isFirst={index === 0}
                      isLast={index === timeline.length - 1}
                      isLiveEvent={
                        !!train.lastReportedLocation &&
                        stop.name.toUpperCase() === train.lastReportedLocation.toUpperCase()
                      }
                    />
                  ))}
                </VStack>
              </Box>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default TrainDetailPanel;