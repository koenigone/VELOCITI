import { Flex, Spinner } from '@chakra-ui/react'

// loading spinner - main map component
export const MapSpinner = () => {
    return (
        <Flex
            justify="center"
            align="center"
            minH="100vh"
        >
            <Spinner color="blue.500" size="xl" thickness="3px" />
        </Flex>
    );
}

// loading spinner - sidebar / train detail panel
export const DataSpinner = () => {
    return (
        <Flex
            justify="center"
            py={8}
        >
            <Spinner color="blue.500" size="xl" thickness="3px" />
        </Flex>
    );
}