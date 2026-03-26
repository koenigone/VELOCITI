import { Box } from "@chakra-ui/react";

const BottomPanel = ({ children }: { children: React.ReactNode }) => {
return (
  <Box
  bg="white"
  h="100%"
  borderTopRadius="2xl"
  boxShadow="0 -8px 30px rgba(0,0,0,0.2)"
  overflow="hidden"
  >
  <Box
  w="40px"
  h="4px"
  bg="gray.300"
  borderRadius="full"
  mx="auto"
  mt={2}
  mb={2}
  />

{children}
</Box>
);
};

export default BottomPanel;