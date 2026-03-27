import { Flex, Box, useBreakpointValue } from '@chakra-ui/react';
import Header from './components/header';
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

            {/* header */}
            <Header />

            {/* mobile layout: full-screen map with bottom panel overlay */}
            {isMobile ? (
                <Box flex="1" position="relative">

                    {/* map fills the entire background */}
                    <Box h="100%" w="100%">
                        {mapContent}
                    </Box>

                    {/* bottom panel overlay — shows train detail if selected, otherwise sidebar */}
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
