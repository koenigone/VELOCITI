import { useState, useEffect } from 'react';
import {
  Box, Text, Flex, Spinner, Badge, Icon, IconButton,
  Tabs, TabList, Tab, TabPanels, TabPanel, VStack, HStack, Tooltip
} from '@chakra-ui/react';
import { FaTimes, FaClock } from 'react-icons/fa';
import { MdTrain, MdArrowForward } from 'react-icons/md';
import { trainApi } from '../../api/api';
import type { Train, TiplocData } from '../../types';

import tiplocDataRaw from '../../data/TiplocPublicExport_2025-12-01_094655.json';

// load all tiplocs from the local JSON for name lookups
const ALL_TIPLOCS = (tiplocDataRaw as any).Tiplocs as TiplocData[];

// lookup helper: find a TIPLOC's display name from the local dataset
const getTiplocName = (code: string): string => {
  const found = ALL_TIPLOCS.find(t => t.Tiploc === code);
  return found?.Name || code;
};


interface TrainDetailPanelProps {
  train: Train;
  onClose: () => void;
}


/* determines the overall status display for the train header
   uses same logic as sidebar getTrainStatus for consistency
*/
const getTrainStatus = (train: Train) => {
  if (train.cancelled) return { badgeScheme: "red", label: "CANCELLED" };
  if (train.lastReportedType === "TERMINATED") return { badgeScheme: "yellow", label: "TERMINATED" };
  if (train.lastReportedDelay > 4) return { badgeScheme: "red", label: `${train.lastReportedDelay} MIN LATE` };
  return { badgeScheme: "green", label: "ON TIME" };
};


/* formats an ISO string to HH:MM for display
   returns null for invalid or missing input
*/
const formatTime = (isoString?: string | null): string | null => {
  if (!isoString) return null;
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};


/* calculates delay in minutes between scheduled and actual time
   returns null if either time is missing or invalid
*/
const calculateDelay = (scheduled?: string | null, actual?: string | null): number | null => {
  if (!scheduled || !actual) return null;
  const s = new Date(scheduled).getTime();
  const a = new Date(actual).getTime();
  if (isNaN(s) || isNaN(a)) return null;
  return Math.round((a - s) / 60000);
};


// internal timeline stop type used for rendering the progress tab
interface TimelineStop {
  tiploc: string;
  name: string;
  locationType: string;
  arrival?: string | null;
  departure?: string | null;
  pass?: string | null;
  actualArrival?: string | null;
  actualDeparture?: string | null;
  actualPass?: string | null;
  arrivalDelay?: number | null;
  departureDelay?: number | null;
  platform?: string | null;
  isPass: boolean;
}


/* checks if an object looks like a schedule location entry
   used by the deep response parser to find the locations array
*/
const looksLikeLocation = (obj: any): boolean => {
  if (!obj || typeof obj !== 'object') return false;
  const keys = ['tiploc', 'Tiploc', 'tiplocCode', 'TiplocCode', 'location', 'Location'];
  return keys.some(k => typeof obj[k] === 'string' && obj[k].length >= 2 && obj[k].length <= 12);
};


/* recursively searches an API response for an array of location-like objects
   handles any nesting depth the API might use
*/
const findLocationsArray = (data: any, depth: number = 0): any[] | null => {
  if (depth > 5) return null;
  if (Array.isArray(data)) {
    return data.length > 0 && looksLikeLocation(data[0]) ? data : null;
  }
  if (data && typeof data === 'object') {
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key]) && data[key].length > 1 && looksLikeLocation(data[key][0])) return data[key];
    }
    for (const key of Object.keys(data)) {
      if (data[key] && typeof data[key] === 'object' && !Array.isArray(data[key])) {
        const found = findLocationsArray(data[key], depth + 1);
        if (found) return found;
      }
    }
  }
  return null;
};


/* parses the full schedule API response into TimelineStop objects
   handles multiple possible response formats from the API
*/
const parseScheduleLocations = (data: any, train: Train): TimelineStop[] => {
  // use deep finder to locate the locations array regardless of nesting
  const rawLocations: any[] = findLocationsArray(data) || [];

  if (rawLocations.length === 0) {
    // fallback: construct minimal timeline from the train's origin/destination
    return [
      {
        tiploc: train.originTiploc,
        name: train.originLocation || getTiplocName(train.originTiploc),
        locationType: "ORIGIN",
        departure: train.scheduledDeparture,
        actualDeparture: train.actualDeparture,
        arrivalDelay: null,
        departureDelay: calculateDelay(train.scheduledDeparture, train.actualDeparture),
        isPass: false,
      },
      {
        tiploc: train.destinationTiploc,
        name: train.destinationLocation || getTiplocName(train.destinationTiploc),
        locationType: "DESTINATION",
        arrival: train.scheduledArrival,
        actualArrival: train.actualArrival,
        arrivalDelay: calculateDelay(train.scheduledArrival, train.actualArrival),
        departureDelay: null,
        isPass: false,
      }
    ];
  }

  // map raw API locations to our internal TimelineStop format
  return rawLocations.map((loc: any, index: number) => {
    const tiploc = (loc.tiploc || loc.Tiploc || loc.tiplocCode || loc.TiplocCode || loc.location || loc.Location || '').toUpperCase().trim();
    const name = loc.locationName || loc.LocationName || loc.name || loc.Name || getTiplocName(tiploc);

    // determine if this is a pass-through or a stopping point
    const hasPass = !!(loc.pass || loc.Pass || loc.scheduledPass || loc.wttPass || loc.actualPass);
    const hasArrival = !!(loc.arrival || loc.Arrival || loc.scheduledArrival || loc.wttArrival || loc.actualArrival || loc.gbttBookedArrival);
    const hasDeparture = !!(loc.departure || loc.Departure || loc.scheduledDeparture || loc.wttDeparture || loc.actualDeparture || loc.gbttBookedDeparture);
    const isPass = hasPass && !hasArrival && !hasDeparture;

    // determine location type based on position in the array
    let locationType = loc.locationType || loc.LocationType || "INTERMEDIATE";
    if (index === 0) locationType = "ORIGIN";
    if (index === rawLocations.length - 1) locationType = "DESTINATION";

    // extract times - handle various API field naming conventions
    const arrival = loc.arrival || loc.Arrival || loc.scheduledArrival || loc.gbttBookedArrival || loc.wttArrival || null;
    const departure = loc.departure || loc.Departure || loc.scheduledDeparture || loc.gbttBookedDeparture || loc.wttDeparture || null;
    const pass = loc.pass || loc.Pass || loc.scheduledPass || loc.wttPass || null;
    const actualArrival = loc.actualArrival || loc.ActualArrival || null;
    const actualDeparture = loc.actualDeparture || loc.ActualDeparture || null;
    const actualPass = loc.actualPass || loc.ActualPass || null;

    return {
      tiploc,
      name,
      locationType,
      arrival,
      departure,
      pass,
      actualArrival,
      actualDeparture,
      actualPass,
      arrivalDelay: loc.arrivalDelay ?? loc.ArrivalDelay ?? calculateDelay(arrival, actualArrival),
      departureDelay: loc.departureDelay ?? loc.DepartureDelay ?? calculateDelay(departure, actualDeparture),
      platform: loc.platform || loc.Platform || null,
      isPass,
    };
  });
};


// ---- Main Train Detail Panel Component ----

const TrainDetailPanel = ({ train, onClose }: TrainDetailPanelProps) => {
  const [locations, setLocations] = useState<TimelineStop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, setError] = useState<string | null>(null);

  const status = getTrainStatus(train);

  // fetch full schedule when train changes
  useEffect(() => {
    let cancelled = false;

    const fetchSchedule = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // use scheduleId from the train object (comes from the API response)
        const data = await trainApi.getFullSchedule(train.scheduleId!.toString());
        if (cancelled) return;

        console.log('[Velociti Detail] Schedule response:', data);

        const parsed = parseScheduleLocations(data, train);
        console.log('[Velociti Detail] Parsed', parsed.length, 'timeline stops');
        setLocations(parsed);
      } catch (err: any) {
        if (cancelled) return;
        setError(err.message || "Failed to load journey details");
        // use fallback minimal timeline
        setLocations(parseScheduleLocations(null, train));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchSchedule();
    return () => { cancelled = true; };
  }, [train]);


  return (
    <Box
      w={{ base: "320px", md: "370px" }}
      minW="320px"
      maxW="400px"
      h="full"
      bg="white"
      borderLeftWidth="1px"
      borderColor="gray.200"
      shadow="xl"
      display="flex"
      flexDirection="column"
      zIndex={10}
    >
      {/* ---- Panel Header ---- */}
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
            </HStack>

            <Text fontSize="xs" color="blue.600" fontWeight="600" mb={2}>
              {train.toc_Name || "Operator Unknown"}
            </Text>

            {/* origin → destination summary */}
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

      {/* ---- Tabs: Progress / Consist / Notes ---- */}
      <Tabs variant="enclosed" size="sm" colorScheme="blue" flex={1} display="flex" flexDirection="column">
        <TabList borderBottomWidth="1px" borderColor="gray.200" bg="gray.50">
          <Tab fontWeight="600" fontSize="xs" _selected={{ bg: "white", color: "blue.600", borderBottomColor: "white" }}>
            Progress
          </Tab>
          <Tab fontWeight="600" fontSize="xs" _selected={{ bg: "white", color: "blue.600", borderBottomColor: "white" }}>
            Consist
          </Tab>
          <Tab fontWeight="600" fontSize="xs" _selected={{ bg: "white", color: "blue.600", borderBottomColor: "white" }}>
            Notes
          </Tab>
        </TabList>

        <TabPanels flex={1} overflow="hidden">
          {/* ---- Progress Tab: Journey Timeline ---- */}
          <TabPanel p={0} h="full" overflow="hidden" display="flex" flexDirection="column">
            {/* route summary bar */}
            <Flex px={4} py={2} borderBottomWidth="1px" borderColor="gray.100" bg="gray.50" justify="space-between" align="center">
              <Text fontSize="xs" fontWeight="600" color="gray.600">
                {train.originLocation || train.originTiploc} → {train.destinationLocation || train.destinationTiploc}
              </Text>
              {locations.length > 2 && (
                <Text fontSize="xs" color="gray.400">{locations.length} stops</Text>
              )}
            </Flex>

            {isLoading ? (
              <Flex justify="center" align="center" flex={1} py={12}>
                <Spinner color="blue.500" size="lg" thickness="3px" />
              </Flex>
            ) : (
              <Box flex={1} overflowY="auto" py={2}>
                <VStack spacing={0} align="stretch">
                  {locations.map((stop, index) => (
                    <TimelineItem
                      key={`${stop.tiploc}-${index}`}
                      stop={stop}
                      isFirst={index === 0}
                      isLast={index === locations.length - 1}
                    />
                  ))}
                </VStack>
              </Box>
            )}
          </TabPanel>

          {/* ---- Consist Tab (placeholder for Sprint 3) ---- */}
          <TabPanel>
            <Flex direction="column" align="center" justify="center" py={12} color="gray.400">
              <Icon as={MdTrain} boxSize={10} mb={3} opacity={0.2} />
              <Text fontSize="sm" fontWeight="medium" color="gray.500">
                Consist data not yet available
              </Text>
              <Text fontSize="xs" color="gray.400" mt={1}>
                Train formation details will appear here
              </Text>
            </Flex>
          </TabPanel>

          {/* ---- Notes Tab (placeholder for Sprint 3) ---- */}
          <TabPanel>
            <Flex direction="column" align="center" justify="center" py={12} color="gray.400">
              <Text fontSize="sm" fontWeight="medium" color="gray.500">
                No notes for this service
              </Text>
              <Text fontSize="xs" color="gray.400" mt={1}>
                Operator notes and alerts will appear here
              </Text>
            </Flex>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};


// ---- Timeline Item Sub-Component ----

const TimelineItem = ({ stop, isFirst, isLast }: { stop: TimelineStop; isFirst: boolean; isLast: boolean }) => {
  // dot colour based on position in the timeline
  const dotColor = isFirst ? "green.400" : isLast ? "red.400" : stop.isPass ? "blue.300" : "blue.500";
  const dotSize = (isFirst || isLast) ? "10px" : stop.isPass ? "7px" : "9px";

  // check for delays at this stop
  const arrDelay = stop.arrivalDelay;
  const depDelay = stop.departureDelay;
  const hasDelay = (arrDelay !== null && arrDelay !== undefined && arrDelay > 0) || (depDelay !== null && depDelay !== undefined && depDelay > 0);
  const maxDelay = Math.max(arrDelay || 0, depDelay || 0);

  // format all times for display
  const scheduledArr = formatTime(stop.arrival);
  const scheduledDep = formatTime(stop.departure);
  const scheduledPass = formatTime(stop.pass);
  const actualArr = formatTime(stop.actualArrival);
  const actualDep = formatTime(stop.actualDeparture);
  const actualPassTime = formatTime(stop.actualPass);

  return (
    <Flex px={4} minH="48px">
      {/* ---- Timeline Column (dot + line) ---- */}
      <Flex direction="column" align="center" w="24px" flexShrink={0} mr={3}>
        {/* top line segment */}
        {!isFirst && <Box w="2px" flex="1" bg="blue.100" minH="8px" />}

        {/* dot */}
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

        {/* bottom line segment */}
        {!isLast && <Box w="2px" flex="1" bg="blue.100" minH="8px" />}
      </Flex>

      {/* ---- Content Column ---- */}
      <Box flex={1} py={2} borderBottomWidth={isLast ? "0" : "1px"} borderColor="gray.100">
        {/* location name and TIPLOC code */}
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
          {stop.platform && (
            <Badge fontSize="0.55em" colorScheme="blue" variant="outline" px={1}>
              Plt {stop.platform}
            </Badge>
          )}
        </Flex>

        {/* timing rows */}
        <VStack spacing={0.5} align="stretch">
          {/* arrival time */}
          {(scheduledArr || actualArr) && !stop.isPass && (
            <TimingRow label="Arrival" scheduled={scheduledArr} actual={actualArr} delay={stop.arrivalDelay} />
          )}

          {/* departure time */}
          {(scheduledDep || actualDep) && !stop.isPass && (
            <TimingRow label="Departure" scheduled={scheduledDep} actual={actualDep} delay={stop.departureDelay} />
          )}

          {/* pass time */}
          {stop.isPass && (scheduledPass || actualPassTime) && (
            <TimingRow label="Pass" scheduled={scheduledPass} actual={actualPassTime} delay={null} />
          )}
        </VStack>

        {/* delay badge */}
        {hasDelay && maxDelay > 0 && (
          <Badge mt={1} fontSize="0.6em" colorScheme={maxDelay >= 5 ? "red" : "orange"} variant="subtle" px={1.5}>
            +{maxDelay}m
          </Badge>
        )}
      </Box>
    </Flex>
  );
};


// ---- Timing Row Sub-Component ----

const TimingRow = ({ label, scheduled, actual, delay }: {
  label: string;
  scheduled: string | null;
  actual: string | null;
  delay: number | null | undefined;
}) => {
  // colour for actual time based on delay
  const getTimeColor = () => {
    if (delay === null || delay === undefined) return "gray.600";
    if (delay > 0) return "red.500";
    if (delay < 0) return "blue.500";
    return "green.500";
  };

  return (
    <HStack spacing={2} fontSize="xs">
      <Text w="55px" color="gray.400" fontWeight="600">{label}</Text>
      <Text fontFamily="mono" color="gray.600" w="42px">{scheduled || "--:--"}</Text>
      {actual && (
        <Text fontFamily="mono" color={getTimeColor()} fontWeight="600" w="42px">{actual}</Text>
      )}
      {delay !== null && delay !== undefined && delay > 0 && (
        <Badge fontSize="0.55em" colorScheme="red" variant="subtle" px={1}>+{delay}m</Badge>
      )}
    </HStack>
  );
};


export default TrainDetailPanel;
