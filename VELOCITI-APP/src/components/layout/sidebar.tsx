import { Box, VStack, Input, Text, Heading } from '@chakra-ui/react';

const Sidebar = () => {
  return (
    <Box h="full" display="flex" flexDirection="column">
      
      {/* sidebar header */}
      <Box p="4" borderBottomWidth="1px" borderColor="gray.200">
        <Heading size="sm">could add a search bar here</Heading>
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