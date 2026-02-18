import { useState } from 'react';
import {
  Box, VStack, Input, Text, Button, useToast,
  Card, CardBody, Badge, Flex, Spinner
} from '@chakra-ui/react';
import { FaSearch } from 'react-icons/fa';
import { trainApi } from '../../api/api';
import type { Train } from '../../types';

interface SidebarProps {
  onLocationSelect: (lat: number, lng: number) => void;
  onTrainSelect: (train: Train) => void;
}

const Sidebar = ({ onLocationSelect, onTrainSelect }: SidebarProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [trains, setTrains] = useState<Train[]>([]);
  const [selectedTrainId, setSelectedTrainId] = useState<string | null>(null);
  const toast = useToast();

  // handle searching for a station and fetching its schedule
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    setTrains([]);
    setSelectedTrainId(null);

    try {
      // get searched tiploc's location and move map there
      const location = await trainApi.getLocation(searchTerm);
      onLocationSelect(location.latitude, location.longitude);

      // get schedule for searched tiploc and show in sidebar
      const schedule = await trainApi.getSchedule(searchTerm);
      setTrains(schedule);

    } catch (error: any) { // handle case where no trains are found but location is valid
      toast({
        title: "Search failed",
        description: error.message || "Could not find station or schedule.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // handle clicking a train card - set selected and notify App
  const handleTrainClick = (train: Train) => {
    setSelectedTrainId(train.trainId);
    onTrainSelect(train);
  };

  // allow pressing enter as alternative to clicking search button
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <Box h="full" display="flex" flexDirection="column" bg="white" borderRight="1px" borderColor="gray.200">
      {/* Sidebar Header */}
      <Box p="4" borderBottomWidth="1px" borderColor="gray.200" bg="white">
        <Text fontSize="xs" fontWeight="bold" color="gray.500" letterSpacing="wider" mb="2">
          TRAIN SEARCH
        </Text>
        <Flex gap={2}>
          <Input
            placeholder="Enter TIPLOC (e.g. SHEFFLD)"
            size="sm"
            borderRadius="md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            focusBorderColor="blue.900"
          />
          <Button
            size="sm"
            colorScheme="blue"
            onClick={handleSearch}
            isLoading={isLoading}
            disabled={!searchTerm}
          >
            <FaSearch />
          </Button>
        </Flex>
      </Box>

      {/* Results List */}
      <VStack flex="1" overflowY="auto" p="2" spacing="2" align="stretch" bg="gray.50">
        {isLoading && (
          <Flex justify="center" py={8}>
            <Spinner color="blue.500" />
          </Flex>
        )}

        {!isLoading && trains.map((train) => (
          <Card
            key={train.trainId}
            size="sm"
            cursor="pointer"
            onClick={() => handleTrainClick(train)}
            bg={selectedTrainId === train.trainId ? "blue.50" : "white"}
            borderColor={selectedTrainId === train.trainId ? "blue.400" : "gray.200"}
            borderWidth="1px"
            _hover={{ shadow: "md", borderColor: "blue.200" }}
            transition="all 0.2s"
          >
            <CardBody py={2} px={3}>
              <Flex justify="space-between" align="center" mb={1}>
                <Badge colorScheme="blue" fontSize="0.7em" variant="solid">
                  {train.headCode}
                </Badge>
                <Text fontSize="xs" color="gray.500">
                  {new Date(train.scheduledDeparture).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </Flex>
              <Text fontSize="sm" fontWeight="semibold" isTruncated title={train.destinationLocation}>
                {train.destinationLocation}
              </Text>
            </CardBody>
          </Card>
        ))}

        {!isLoading && trains.length === 0 && searchTerm && (
          <Text p={4} fontSize="xs" color="gray.500" textAlign="center">
            {trains.length === 0 ? "No trains found." : "Search for a station to see trains."}
          </Text>
        )}
      </VStack>
    </Box>
  );
};

export default Sidebar;
