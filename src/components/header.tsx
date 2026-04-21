import { Flex, Heading, Text } from '@chakra-ui/react';

const Header = () => {
    return (
        <Flex
            as="header"
            w="full"
            h={{ base: "44px", md: "64px" }}
            align="center"
            px={{ base: "4", md: "6" }}
            bg="blue.900"
            color="white"
            shadow="md"
            zIndex="sticky"
            flexShrink={0}
        >
            <Heading size={{ base: "sm", md: "md" }} letterSpacing="wide">
                VELOCITI
            </Heading>
            <Text ml={2} opacity={0.8} fontWeight="light" fontSize={{ base: "xs", md: "md" }}>
                | National Map
            </Text>
        </Flex>
    );
};

export default Header;