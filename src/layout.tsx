import { Flex, Box} from '@chakra-ui/react';
import Header from './components/layout/header';
import { useBreakpointValue } from '@chakra-ui/react';
import BottomPanel from './components/mobile/BottomPanel';

interface LayoutProps {
    sideContent: React.ReactNode;
    mapContent: React.ReactNode;
    panelContent?: React.ReactNode;
}

const Layout = ({ sideContent, mapContent, panelContent }: LayoutProps) => {

    const isMobile = useBreakpointValue({ base: true, md: false });

    return (
  <Flex direction="column" h="100vh" w="full" overflow="hidden">

    <Header />

    {/* MOBILE LAYOUT */}
    {isMobile ? (
  <Box flex="1" position="relative">

    {/* MAP BACKGROUND */}
    <Box h="100%" w="100%">
      {mapContent}
    </Box>

    {/* BOTTOM PANEL (OVERLAY) */}
    <Box
      position="absolute"
      bottom="0"
      left="0"
      right="0"
      h="60%"
      zIndex="1000"
    >
      <BottomPanel>
        {panelContent ? panelContent : sideContent}
      </BottomPanel>
    </Box>

    </Box>
    ): (

      <Flex flex="1" as="main" overflow="hidden">

        <Box
          w={{ base: "300px", md: "30%" }}
          minW="320px"
          maxW="450px"
          bg="white"
          borderRightWidth="1px"
          borderColor="gray.200"
          shadow="xl"
          zIndex="10"
        >
          {sideContent}
        </Box>

        <Box flex="1" position="relative">
          {mapContent}
        </Box>

        {panelContent && panelContent}

      </Flex>
    )}
  </Flex>
);
}

export default Layout;