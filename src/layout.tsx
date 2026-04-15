import { Flex, Box, useBreakpointValue } from '@chakra-ui/react';
import Header from './components/header';
import BottomSheet from './components/mobile/bottomSheet';

interface LayoutProps {
    sideContent: React.ReactNode;
    mapContent: React.ReactNode;
    panelContent?: React.ReactNode;
}

const Layout = ({ sideContent, mapContent, panelContent }: LayoutProps) => {

    const isMobile = useBreakpointValue({ base: true, md: false });

    return (
        <Flex direction="column" h="100vh" w="full" overflow="hidden">

            {/* header */}
            <Header />

            {/* mobile layout: full-screen map with draggable bottom sheet */}
            {isMobile ? (
                <Box flex="1" position="relative" overflow="hidden">

                    {/* map fills the entire background */}
                    <Box position="absolute" inset="0">
                        {mapContent}
                    </Box>

                    {/* draggable bottom sheet — swaps content based on whether a train is selected */}
                    <BottomSheet forceExpand={!!panelContent}>
                        {panelContent ? panelContent : sideContent}
                    </BottomSheet>

                </Box>
            ) : (

                /* desktop layout: sidebar | map | train detail panel */
                <Flex flex="1" as="main" overflow="hidden">

                    {/* sidebar */}
                    <Box
                        w={{ base: "300px", md: "30%" }}
                        minW="320px"
                        maxW="400px"
                        bg="white"
                        borderRightWidth="1px"
                        borderColor="gray.200"
                        shadow="xl"
                        zIndex="10"
                    >
                        {sideContent}
                    </Box>

                    {/* map content */}
                    <Box flex="1" position="relative">
                        {mapContent}
                    </Box>

                    {/* train detail panel (right side) */}
                    {panelContent && panelContent}

                </Flex>
            )}
        </Flex>
    );
}

export default Layout;
