import { useState } from 'react';
import {
  Box, VStack, Input, Text, Button, useToast, Card, CardBody, Badge, Flex, Spinner, HStack, Icon
} from '@chakra-ui/react';
import { FaSearch, FaCircle } from 'react-icons/fa';
import { MdTrain } from 'react-icons/md';
import { trainApi } from '../../api/api';
import type { Train } from '../../types';


interface SidebarProps {
  onLocationSelect: (lat: number, lng: number, stationCode: string) => void;
  onTrainSelect: (train: Train) => void;
}


/* this function determines the status of a train based on its properties
  and returns an object with the appropriate color, badge scheme, and label for display in the UI
*/
const getTrainStatus = (train: Train) => {
  if (train.cancelled) return { color: "red.600", badgeScheme: "red", label: "CANCELLED" }; // when cancelled, overrides all other statuses
  if (train.lastReportedType === "TERMINATED") return { color: "gray.500", badgeScheme: "gray", label: "TERMINATED" }; // terminated trains are not cancelled but have ended their journey early
  if (train.lastReportedDelay > 4) return { color: "red.500", badgeScheme: "red", label: `${train.lastReportedDelay} MINS LATE` }; // late trains with delay greater than 4 mins
  return { color: "green.500", badgeScheme: "green", label: "ON TIME" }; // default status for trains that are not cancelled, terminated, or late
};


/* format time from long string to HH:MM format
  returns "--:--" if the input is invalid or missing
*/
const formatTime = (isoString?: string) => {
  if (!isoString) return "--:--";

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "--:--";

  // format time as HH:MM
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};


// main sidebar component
const Sidebar = ({ onLocationSelect, onTrainSelect }: SidebarProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [trains, setTrains] = useState<Train[]>([]);
  const [selectedTrainId, setSelectedTrainId] = useState<string | null>(null);
  const toast = useToast();

  // handle search for station and its schedule
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setIsLoading(true);       // show loading spinner
    setTrains([]);            // clear previous search results
    setSelectedTrainId(null); // clear selected train

    try { // fetch location data for the searched tiploc
      const location = await trainApi.getLocation(searchTerm);
      const schedule = await trainApi.getSchedule(searchTerm);

      onLocationSelect(location.latitude, location.longitude, searchTerm.toUpperCase());
      setTrains(schedule);

    } catch (error: any) {
      toast({ // custom error toast
        title: "Search failed",
        description: error.message || "Could not find station.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // quality of life feature - allow pressing Enter to trigger search
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <Box h="full" display="flex" flexDirection="column" bg="white" borderRight="1px" borderColor="gray.200">

      {/* search area */}
      <Box p="4" borderBottomWidth="1px" borderColor="gray.200" bg="white" shadow="sm" zIndex={10}>
        <Text fontSize="xs" fontWeight="bold" color="gray.500" letterSpacing="wider" mb="2">
          TRAIN SEARCH
        </Text>

        <Flex gap={2}>
          <Input
            placeholder="Enter TIPLOC (e.g. EUSTON)"
            size="sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            focusBorderColor="blue.500"
            bg="gray.50"
          />
          <Button size="sm" colorScheme="blue" onClick={handleSearch} isLoading={isLoading} disabled={!searchTerm}>
            <FaSearch />
          </Button>
        </Flex>
      </Box>

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
            <Icon as={MdTrain} boxSize={12} mb={4} opacity={0.2} />
            <Text fontSize="md" fontWeight="medium" textAlign="center" color="gray.500" mb={1}>
              {!searchTerm
                ? "Search for a station"
                : "No active trains found"}
            </Text>
            <Text fontSize="sm" textAlign="center" px={6}>
              {!searchTerm
                ? "Enter a TIPLOC code above to view live departures"
                : "We couldn't find any schedule for this TIPLOC. Please try another."}
            </Text>
          </Flex>
        )}

      </VStack>
    </Box>
  );
};

export default Sidebar;