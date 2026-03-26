import {
  Box, Card, CardBody, Flex, HStack, VStack, Icon, Text, Badge
} from '@chakra-ui/react';
import { FaCircle } from 'react-icons/fa';
import { MdTrain } from 'react-icons/md';
import { getTrainStatus, formatTime } from '../../utils/trainUtils';
import type { Train } from '../../types';

interface TrainCardProps {
  train: Train;
  isSelected: boolean;
  onSelect: () => void;
}

const TrainCard = ({ train, isSelected, onSelect }: TrainCardProps) => {
  const status = getTrainStatus(train);
  const isLate = train.lastReportedDelay > 4 && !train.cancelled;

  return (
    <Card
      h="auto"
      minH="fit-content"
      cursor="pointer"
      onClick={onSelect}
      bg={isSelected ? "blue.50" : "white"}
      borderColor={isSelected ? "blue.400" : "gray.200"}
      borderWidth="1px"
      _hover={{ shadow: "md", borderColor: isSelected ? "blue.400" : "blue.200" }}
      transition="all 0.2s"
      overflow="hidden"
    >
      <Box h="3px" w="full" bg={status.color} />

      <CardBody py={3} px={3}>
        <Flex justify="space-between" align="center" mb={3}>
          <HStack spacing={2}>
            <Icon as={MdTrain} color="gray.600" />
            <Text fontWeight="bold" fontSize="sm" color="gray.700">
              {train.headCode}
            </Text>
          </HStack>
          <Badge colorScheme={status.badgeScheme} variant="subtle" fontSize="0.65em" px={2} py={0.5} borderRadius="sm">
            {status.label}
          </Badge>
        </Flex>

        <Box position="relative" pl={2} mb={3}>
          <Box position="absolute" left="11px" top="10px" bottom="10px" w="2px" bg="gray.200" />

          <VStack align="stretch" spacing={3}>
            <Flex align="center" gap={3}>
              <Icon as={FaCircle} color="gray.400" boxSize={2} zIndex={1} />
              <Text fontSize="sm" fontWeight="semibold" w="45px" color={isLate ? "red.500" : "gray.700"}>
                {formatTime(train.scheduledDeparture)}
              </Text>
              <Text fontSize="xs" fontWeight="medium" color="gray.600" isTruncated>
                {train.originLocation || train.originTiploc}
              </Text>
            </Flex>

            <Flex align="center" gap={3}>
              <Icon as={FaCircle} color={status.color} boxSize={2} zIndex={1} />
              <Text fontSize="sm" fontWeight="semibold" w="45px" color={isLate ? "red.500" : "gray.700"}>
                {formatTime(train.scheduledArrival)}
              </Text>
              <Text fontSize="sm" fontWeight="bold" color="gray.800" isTruncated>
                {train.destinationLocation || train.destinationTiploc}
              </Text>
            </Flex>
          </VStack>
        </Box>

        <Flex justify="space-between" align="center" borderTopWidth="1px" borderColor="gray.100" pt={2}>
          <Text fontSize="2xs" color="gray.500" fontWeight="medium" textTransform="uppercase" letterSpacing="wide">
            {train.toc_Name || "Operator Unknown"}
          </Text>
        </Flex>

      </CardBody>
    </Card>
  );
};

export default TrainCard;