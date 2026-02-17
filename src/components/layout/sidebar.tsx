import { Box, VStack, Input, Text } from '@chakra-ui/react';
// import type { Stop } from '../../App';

// type SidebarProps = {
//   stops: Stop[] | null;
// };

const Sidebar = () => {
  // const hasStops = !!stops && stops.length > 0;

  return (
    <Box h="full" display="flex" flexDirection="column">
      {/* sidebar header */}
      <Box p="4" borderBottomWidth="1px" borderColor="gray.200">
        <Text
          fontSize="xs"
          fontWeight="bold"
          color="gray.500"
          letterSpacing="wider"
          mb="2"
        >
          TRAIN SEARCH
        </Text>
        <Input
          placeholder="Find station"
          size="sm"
          borderRadius="md"
          focusBorderColor="blue.900"
        />
      </Box>

      <VStack
        flex="1"
        overflowY="auto"
        p="4"
        spacing="4"
        align="stretch"
      >
        {/* {hasStops && (
          <Box>
            <Text
              fontSize="xs"
              fontWeight="bold"
              color="gray.500"
              mb="2"
            >
              SCHEDULE
            </Text>

            {stops!.map((stop) => {
              const isLate = stop.status === 'LATE';
              const color = isLate ? 'red.500' : 'green.500';

              return (
                <Flex
                  key={stop.id}
                  justify="space-between"
                  align="center"
                  borderBottomWidth="1px"
                  borderColor="gray.100"
                  py="2"
                >
                  <Box>
                    <Text fontWeight="semibold">
                      {stop.locationName}
                    </Text>

                    <Text fontSize="xs" color="gray.500">
                      Expected: {stop.expectedTime}
                    </Text>
                  </Box>

                  <Box textAlign="right">
                    <Text fontSize="xs" color="gray.500">
                      Actual / Est
                    </Text>

                    <Text fontWeight="bold" color={color}>
                      {stop.actualOrEstimatedTime}
                    </Text>
                  </Box>
                </Flex>
              );
            })}
          </Box>
        )} */}
      </VStack>
    </Box>
  );
};

export default Sidebar;
