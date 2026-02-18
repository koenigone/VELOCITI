import { useState } from 'react';
import {
  Box, VStack, Input, Text, Button, useToast,
  Card, CardBody, Badge, Flex, Spinner
} from '@chakra-ui/react';
import { FaSearch } from 'react-icons/fa';
import { trainApi } from '../../api/api';
import type { Train } from '../../types';

interface SidebarProps 
{
  onLocationSelect: (lat: number, lng: number) => void;
  onTrainSelect: (train: Train) => void;
  selectedTrain: any | null;
  routeStops: any[];
}

const Sidebar = 
({
  onLocationSelect,
  onTrainSelect,
  selectedTrain,
  routeStops
}: SidebarProps) => 
{

  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [trains, setTrains] = useState<Train[]>([]);
  const [selectedTrainId, setSelectedTrainId] = useState<string | null>(null);
  const toast = useToast();

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    setTrains([]);
    setSelectedTrainId(null);

    try {
      const location = await trainApi.getLocation(searchTerm);
      onLocationSelect(location.latitude, location.longitude);

      const schedule = await trainApi.getSchedule(searchTerm);
      setTrains(schedule);

    } catch (error: any) {
      toast({
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

  const handleTrainClick = (train: Train) => {
    setSelectedTrainId(train.trainId);
    onTrainSelect(train);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <Box h="full" display="flex" flexDirection="column" bg="white" borderRight="1px" borderColor="gray.200">

      {/* SEARCH */}
      <Box p="4" borderBottomWidth="1px" borderColor="gray.200">
        <Text fontSize="xs" fontWeight="bold" color="gray.500" mb="2">
          TRAIN SEARCH
        </Text>

        <Flex gap={2}>
          <Input
            placeholder="Enter TIPLOC"
            size="sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button
            size="sm"
            colorScheme="blue"
            onClick={handleSearch}
            isLoading={isLoading}
          >
            <FaSearch />
          </Button>
        </Flex>
      </Box>

      {/* TRAIN RESULTS */}
      <VStack flex="1" overflowY="auto" p="3" spacing="3" align="stretch" bg="gray.50">

        {isLoading && (
          <Flex justify="center" py={8}>
            <Spinner />
          </Flex>
        )}

        {!isLoading && trains.map((train) => (
          <Card
            key={train.trainId}
            size="sm"
            cursor="pointer"
            onClick={() => handleTrainClick(train)}
            bg={selectedTrainId === train.trainId ? "blue.50" : "white"}
            borderWidth="1px"
          >
            <CardBody py={2}>
              <Flex justify="space-between">
                <Badge colorScheme="blue">{train.headCode}</Badge>
                <Text fontSize="xs">
                  {new Date(train.scheduledDeparture).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </Flex>
              <Text fontWeight="semibold">
                {train.originLocation} → {train.destinationLocation}
              </Text>
            </CardBody>
          </Card>
        ))}

        {/* STOP DETAILS SECTION */}
        {selectedTrain && routeStops.length > 0 && (
          <Box mt="4">
            <Text fontSize="xs" fontWeight="bold" color="gray.500" mb="2">
              ROUTE STOPS
            </Text>

            {routeStops.map((stop, index) => (
              <Box
                key={index}
                p="2"
                borderBottomWidth="1px"
                borderColor="gray.200"
              >
                <Text fontWeight="semibold">{stop.name}</Text>
                <Text fontSize="xs" color="gray.500">
                  {stop.type}
                </Text>
              </Box>
            ))}
          </Box>
        )}

      </VStack>
    </Box>
  );
};

export default Sidebar;


