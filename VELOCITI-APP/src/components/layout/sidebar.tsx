import { Box, VStack, Input, Text } from '@chakra-ui/react';

const Sidebar = () => {
  return (
    <Box h="full" display="flex" flexDirection="column">

      {/* sidebar header */}
      <Box p="4" borderBottomWidth="1px" borderColor="gray.200">
        <Text fontSize="xs" fontWeight="bold" color="gray.500" letterSpacing="wider" mb="2">
          TRAIN SEARCH
        </Text>
        <Input
          placeholder="Find train"
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
        <Box textAlign="center" py="10" color="gray.500">
          <Text fontSize="sm">Select a train to view schedule.</Text>
        </Box>
      </VStack>

    </Box>
  );
};

export default Sidebar;