import { Box, VStack, Input, Text, Button } from '@chakra-ui/react';
import { useState } from 'react';
import type { Train } from '../../App';

type SidebarProps = {
  trains: Train[];
  setTrains: (trains: Train[]) => void;
  onSelectTrain: (train: Train) => void;
};

const Sidebar = ({ trains, setTrains, onSelectTrain }: SidebarProps) => {
  const [searchValue, setSearchValue] = useState('');

  const API_KEY = import.meta.env.VITE_VELOCITI_API_KEY;

  const handleSearch = async () => {
    if (!searchValue) return;

    const now = new Date();
    const startRaw = now.toISOString().slice(0, 19).replace('T', ' ');
    const endDate = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const endRaw = endDate.toISOString().slice(0, 19).replace('T', ' ');

    const start = encodeURIComponent(startRaw);
    const end = encodeURIComponent(endRaw);

    const url = `https://traindata-stag-api.railsmart.io/api/trains/tiploc/${searchValue}/${start}/${end}`;

    try {
      const response = await fetch(url, {
        headers: {
          'X-ApiKey': API_KEY
        }
      });

      if (!response.ok) {
        console.error("API error:", response.status);
        return;
      }

      const data = await response.json();
      setTrains(data);
    } catch (err) {
      console.error('API Error:', err);
    }
  };

  return (
    <Box h="full" display="flex" flexDirection="column">
      <Box p="4" borderBottomWidth="1px">
        <Text fontSize="xs" fontWeight="bold" mb="2">
          TRAIN SEARCH
        </Text>

        <Input
          placeholder="Enter TIPLOC (e.g. SHEFFLD)"
          size="sm"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value.toUpperCase())}
          mb="2"
        />

        <Button size="sm" colorScheme="blue" onClick={handleSearch}>
          Search
        </Button>
      </Box>

      <VStack flex="1" overflowY="auto" p="4" align="stretch">
        {trains.map((train) => (
          <Box
            key={train.trainId}
            p="2"
            borderWidth="1px"
            borderRadius="md"
            cursor="pointer"
            _hover={{ bg: 'gray.50' }}
            onClick={() => onSelectTrain(train)}
          >
            <Text fontWeight="bold">{train.originLocation}</Text>
            <Text fontSize="sm">
              → {train.destinationLocation}
            </Text>
            <Text fontSize="xs" color="gray.500">
              Dep: {train.scheduledDeparture}
            </Text>
          </Box>
        ))}
      </VStack>
    </Box>
  );
};

export default Sidebar;



