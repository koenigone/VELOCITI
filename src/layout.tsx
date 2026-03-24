import { Flex, Box } from '@chakra-ui/react';
import Header from './components/layout/header';

interface LayoutProps {
    sideContent: React.ReactNode;
    mapContent: React.ReactNode;
    panelContent?: React.ReactNode;
}

const Layout = ({ sideContent, mapContent, panelContent }: LayoutProps) => {
    return (
        <Flex direction="column" h="100vh" w="full" overflow="hidden">

            {/* header */}
            <Header />

            {/* main content: sidebar on left, map content on right  */}
            <Flex flex="1" as="main" overflow="hidden">

                {/* sidebar */}
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

                {/* map content */}
                <Box flex="1" position="relative">
                    {mapContent}
                </Box>

                {/* train detail panel (right side) */}
                {panelContent && panelContent}

            </Flex>
        </Flex>
    );
}

export default Layout;