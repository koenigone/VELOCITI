import { Flex, Heading, Text } from '@chakra-ui/react';

const Header = () => {
    return (
        <Flex
            as="header"
            w="full"
            h="64px"
            align="center"
            px="6"
            bg="blue.900"
            color="white"
            shadow="md"
            zIndex="sticky"
        >
            <Heading size="md" letterSpacing="wide">
                VELOCITI
            </Heading>
            <Text ml={2} opacity={0.8} fontWeight="light">
                | National Map
            </Text>
        </Flex>
    );
};

export default Header;