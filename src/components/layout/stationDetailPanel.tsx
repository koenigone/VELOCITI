import { useState, useEffect } from 'react';
import {
  Box, Text, Flex, Spinner, Badge, Icon, IconButton,
  VStack, HStack, Card, CardBody
} from '@chakra-ui/react';
import { FaTimes, FaMapMarkerAlt } from 'react-icons/fa';
import { MdTrain, MdArrowForward } from 'react-icons/md';
import { trainApi } from '../../api/api';
import { getTrainStatus, formatScheduleTime } from '../../utils/trainUtils';
import type { Train, TiplocData, ScheduleStop } from '../../types';

interface StationDetailPanelProps {
  station: TiplocData;
  onClose: () => void;
  onTrainSelect: (train: Train) => void;
}

interface StationTrainEntry {
  train: Train;
  stationTime: string | null;
  stationEventType: 'departure' | 'arrival' | 'pass';
}


// resolves the scheduled event time for the selected station on a train's route
const resolveStationTiming = async (train: Train, stationCode: string): Promise<Pick<StationTrainEntry, 'stationTime' | 'stationEventType'>> => {
  if (train.originTiploc === stationCode) {
    return {
      stationTime: train.scheduledDeparture,
      stationEventType: 'departure'
    };
  }

  if (train.destinationTiploc === stationCode) {
    return {
      stationTime: train.scheduledArrival,
      stationEventType: 'arrival'
    };
  }

  try {
    const schedule = await trainApi.getTrainSchedule(train.activationId, train.scheduleId);
    const stop = schedule.find((item: ScheduleStop) => item.tiploc === stationCode);

    if (!stop) {
      return {
        stationTime: null,
        stationEventType: 'pass'
      };
    }

    return {
      stationTime: stop.departure || stop.arrival || stop.pass || null,
      stationEventType: stop.departure ? 'departure' : stop.arrival ? 'arrival' : 'pass'
    };
  } catch {
    return {
      stationTime: null,
      stationEventType: 'pass'
    };
  }
};


// converts mixed time formats into a sortable number
const getTimeSortValue = (timeStr: string | null): number => {
  if (!timeStr) return Number.MAX_SAFE_INTEGER;

  if (timeStr.includes('T')) {
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return Number.MAX_SAFE_INTEGER;
    return date.getHours() * 60 + date.getMinutes();
  }

  if (timeStr.includes(':')) {
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      return Number(parts[0]) * 60 + Number(parts[1]);
    }
  }

  const padded = timeStr.padStart(4, '0');
  return Number(padded.slice(0, 2)) * 60 + Number(padded.slice(2, 4));
};


// gets a safe message from an unknown error object
const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};


// main station detail panel component
const StationDetailPanel = ({ station, onClose, onTrainSelect }: StationDetailPanelProps) => {
  const [stationTrains, setStationTrains] = useState<StationTrainEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // fetch station trains and resolve station-specific times when the station changes
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const trains = await trainApi.getTrainsAtStation(station.Tiploc);
        if (cancelled) return;

        const resolved = await Promise.all(
          trains.map(async (train) => {
            const timing = await resolveStationTiming(train, station.Tiploc);
            return {
              train,
              ...timing
            };
          })
        );

        if (cancelled) return;

        const sorted = resolved.sort((a, b) => getTimeSortValue(a.stationTime) - getTimeSortValue(b.stationTime));
        setStationTrains(sorted);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(getErrorMessage(err, 'Failed to load station details'));
        setStationTrains([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [station]);

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
            <HStack spacing={2} mb={1}>
              <Icon as={FaMapMarkerAlt} color="blue.600" boxSize={4} />
              <Text fontWeight="bold" fontSize="xl" color="gray.800">
                {station.Name}
              </Text>
            </HStack>

            <HStack spacing={2} mb={2}>
              <Badge colorScheme="gray" variant="subtle" fontFamily="mono" px={2}>
                {station.Tiploc}
              </Badge>
              {station.Details?.CRS && (
                <Badge colorScheme="blue" variant="subtle" fontFamily="mono" px={2}>
                  {station.Details.CRS}
                </Badge>
              )}
            </HStack>

            <Text fontSize="xs" color="gray.500" fontFamily="mono">
              {station.Latitude.toFixed(5)}, {station.Longitude.toFixed(5)}
            </Text>
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

      <Flex px={4} py={2} borderBottomWidth="1px" borderColor="gray.100" bg="gray.50" justify="space-between" align="center">
        <Text fontSize="xs" fontWeight="600" color="gray.600">
          Departures and arrivals at {station.Name}
        </Text>
        {!isLoading && (
          <Text fontSize="xs" color="gray.400">{stationTrains.length} trains</Text>
        )}
      </Flex>

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
        <Box flex={1} overflowY="auto" p={3} bg="gray.50">
          <VStack spacing={3} align="stretch">
            {stationTrains.map(({ train, stationTime, stationEventType }) => {
              const status = getTrainStatus(train);

              return (
                <Card
                  key={`${train.trainId}-${stationEventType}`}
                  cursor="pointer"
                  bg="white"
                  borderColor="gray.200"
                  borderWidth="1px"
                  _hover={{ shadow: "md", borderColor: "blue.200" }}
                  transition="all 0.2s"
                  overflow="hidden"
                  onClick={() => onTrainSelect(train)}
                >
                  <Box h="3px" w="full" bg={status.color} />

                  <CardBody py={3} px={3}>
                    <Flex justify="space-between" align="center" mb={3}>
                      <HStack spacing={2}>
                        <Icon as={MdTrain} color="gray.600" />
                        <Text fontWeight="bold" fontSize="sm" color="gray.700" fontFamily="mono">
                          {train.headCode}
                        </Text>
                      </HStack>
                      <Badge colorScheme={status.badgeScheme} variant="subtle" fontSize="0.65em" px={2} py={0.5} borderRadius="sm">
                        {status.label}
                      </Badge>
                    </Flex>

                    <Flex justify="space-between" align="center" mb={3}>
                      <HStack spacing={2}>
                        <Badge colorScheme={stationEventType === 'arrival' ? 'purple' : stationEventType === 'departure' ? 'blue' : 'gray'} variant="subtle" fontSize="0.6em" textTransform="uppercase">
                          {stationEventType}
                        </Badge>
                        <Text fontFamily="mono" fontSize="sm" fontWeight="600" color="gray.700">
                          {formatScheduleTime(stationTime)}
                        </Text>
                      </HStack>
                      <Text fontSize="2xs" color="gray.500" fontWeight="medium" textTransform="uppercase" letterSpacing="wide">
                        {train.toc_Name || 'Operator Unknown'}
                      </Text>
                    </Flex>

                    <HStack spacing={2} fontSize="sm" color="gray.600">
                      <Text fontWeight="500" isTruncated maxW="120px">
                        {train.originLocation || train.originTiploc}
                      </Text>
                      <Icon as={MdArrowForward} color="gray.400" />
                      <Text fontWeight="600" color="gray.800" isTruncated maxW="120px">
                        {train.destinationLocation || train.destinationTiploc}
                      </Text>
                    </HStack>
                  </CardBody>
                </Card>
              );
            })}

            {stationTrains.length === 0 && !error && (
              <Flex direction="column" align="center" justify="center" py={12} color="gray.400">
                <Icon as={FaMapMarkerAlt} boxSize={10} mb={4} opacity={0.2} />
                <Text fontSize="md" fontWeight="medium" textAlign="center" color="gray.500" mb={1}>
                  No trains found for this station
                </Text>
                <Text fontSize="sm" textAlign="center" px={6}>
                  Try another TIPLOC or wait for more live data to appear.
                </Text>
              </Flex>
            )}
          </VStack>
        </Box>
      )}
    </Box>
  );
};

export default StationDetailPanel;