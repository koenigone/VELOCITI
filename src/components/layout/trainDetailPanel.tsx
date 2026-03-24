import { useState, useEffect } from 'react';
import {
  Box, Text, Flex, Spinner, Badge, Icon, IconButton,
  Tabs, TabList, Tab, TabPanels, TabPanel, VStack, HStack, Tooltip
} from '@chakra-ui/react';
import { FaTimes, FaClock } from 'react-icons/fa';
import { MdTrain, MdArrowForward } from 'react-icons/md';
import { trainApi } from '../../api/api';
import { getTiplocName } from '../../data/tiplocData';
import { getTrainStatus, formatScheduleTime } from '../../utils/trainUtils';
import type { Train, TimelineStop, ScheduleStop, MovementEvent } from '../../types';
import type { LiveTrackingStatus } from '../../hooks/useLiveSelectedTrain';


interface TrainDetailPanelProps {
  train: Train;
  liveStatus: LiveTrackingStatus;
  onClose: () => void;
}


/* builds the timeline by merging schedule stops with movement events
   schedule gives us: ordered route, tiplocs, lat/lng, planned times
   movement gives us: actual times and variation (delay) at each location
*/
const buildTimeline = (
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


// main train detail panel component
const TrainDetailPanel = ({ train, liveStatus, onClose }: TrainDetailPanelProps) => {
  const [timeline, setTimeline] = useState<TimelineStop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const status = getTrainStatus(train);
  const liveBadge = getLiveBadge(liveStatus);

  // fetch schedule and movement data when train changes
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // fetch both schedule and movement data in parallel
        const [schedule, movements] = await Promise.all([
          trainApi.getTrainSchedule(train.activationId, train.scheduleId),
          trainApi.getTrainMovement(train.activationId, train.scheduleId).catch(() => [] as MovementEvent[])
        ]);

        if (cancelled) return;

        console.log('[Velociti Detail] Schedule:', schedule.length, 'stops | Movement:', movements.length, 'events');

        const built = buildTimeline(schedule, movements, train);
        setTimeline(built);
      } catch (err: unknown) {
        if (cancelled) return;
        console.warn('[Velociti Detail] Failed to fetch journey data:', err);
        setError(getErrorMessage(err, "Failed to load journey details"));

        // use fallback minimal timeline
        setTimeline(buildTimeline([], [], train));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [train]);


  return (
    <Box
      w={{ base: "320px", md: "370px" }}
      minW="320px"
      maxW="420px"
      h="full"
      bg="white"
      borderLeftWidth="1px"
      borderColor="gray.200"
      shadow="xl"
      display="flex"
      flexDirection="column"
      zIndex={10}
    >
      {/* panel header */}
      <Box p={4} borderBottomWidth="1px" borderColor="gray.200" bg="white">
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

          <IconButton
            aria-label="Close panel"
            icon={<FaTimes />}
            variant="ghost"
            size="sm"
            color="gray.400"
            _hover={{ color: "gray.600", bg: "gray.100" }}
            onClick={onClose}
          />
        </Flex>
      </Box>

      {/* tabs (right now we only have progress tab, opened for more)- */}
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
              <Flex justify="center" align="center" flex={1} py={12}>
                <Spinner color="blue.500" size="lg" thickness="3px" />
              </Flex>
            ) : (
              <Box flex={1} overflowY="auto" py={2} minH="0">
                <VStack spacing={0} align="stretch">
                  {timeline.map((stop, index) => (
                    <TimelineItem
                      key={`${stop.tiploc}-${index}`}
                      stop={stop}
                      isFirst={index === 0}
                      isLast={index === timeline.length - 1}
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


// component for rendering each stop in the timeline 
const TimelineItem = ({ stop, isFirst, isLast }: { stop: TimelineStop; isFirst: boolean; isLast: boolean }) => {

  // dot colour based on position in the timeline
  const dotColor = isFirst ? "green.400" : isLast ? "red.400" : stop.isPass ? "blue.300" : "blue.500";
  const dotSize = (isFirst || isLast) ? "10px" : stop.isPass ? "7px" : "9px";

  // format times for display
  const scheduled = formatScheduleTime(stop.scheduledTime);
  const hasDelay = stop.variation !== null && stop.variation > 0;

  return (
    <Flex px={4} minH="48px">
      <Flex direction="column" align="center" w="24px" flexShrink={0} mr={3}>
        {!isFirst && <Box w="2px" flex="1" bg="blue.100" minH="8px" />}

        <Tooltip label={stop.isPass ? "Pass" : isFirst ? "Origin" : isLast ? "Destination" : "Stop"} fontSize="xs">
          <Box
            w={dotSize}
            h={dotSize}
            borderRadius={stop.isPass ? "1px" : "full"}
            transform={stop.isPass ? "rotate(45deg)" : "none"}
            bg={dotColor}
            border="2px solid"
            borderColor={isFirst ? "green.200" : isLast ? "red.200" : "blue.100"}
            flexShrink={0}
            zIndex={1}
          />
        </Tooltip>

        {!isLast && <Box w="2px" flex="1" bg="blue.100" minH="8px" />}
      </Flex>

      <Box flex={1} py={2} borderBottomWidth={isLast ? "0" : "1px"} borderColor="gray.100">
        <Flex align="center" gap={2} mb={1}>
          <Text
            fontSize="xs"
            fontWeight={isFirst || isLast ? "700" : "600"}
            color={isFirst || isLast ? "gray.800" : "gray.700"}
            isTruncated
          >
            {stop.name}
          </Text>
          <Badge fontSize="0.55em" colorScheme="gray" variant="subtle" fontFamily="mono" px={1}>
            {stop.tiploc}
          </Badge>
        </Flex>

        {/* timing row */}
        <HStack spacing={2} fontSize="xs">
          <Text w="55px" color="gray.400" fontWeight="600" textTransform="capitalize">
            {stop.eventType}
          </Text>
          <Text fontFamily="mono" color="gray.600" w="42px">
            {scheduled}
          </Text>
          {stop.actualTime && (
            <Text fontFamily="mono" color={hasDelay ? "red.500" : "green.500"} fontWeight="600" w="42px">
              {new Date(stop.actualTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </HStack>

        {/* delay badge */}
        {hasDelay && stop.variation !== null && (
          <Badge mt={1} fontSize="0.6em" colorScheme={stop.variation >= 5 ? "red" : "orange"} variant="subtle" px={1.5}>
            +{stop.variation}m
          </Badge>
        )}
      </Box>
    </Flex>
  );
};

export default TrainDetailPanel;
