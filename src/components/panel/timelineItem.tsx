import { Box, Flex, Text, Badge, HStack, Tooltip } from '@chakra-ui/react';
import { formatScheduleTime } from '../../utils/trainUtils';
import type { TimelineStop } from '../../types';

interface TimelineItemProps {
  stop: TimelineStop;
  isFirst: boolean;
  isLast: boolean;
  isLiveEvent: boolean;
}

const TimelineItem = ({ stop, isFirst, isLast, isLiveEvent }: TimelineItemProps) => {

  // dot colour based on position in the timeline, live event takes priority
  const dotColor = isLiveEvent ? "orange.400" : isFirst ? "green.400" : isLast ? "red.400" : stop.isPass ? "blue.300" : "blue.500";
  const dotSize = isLiveEvent ? "12px" : (isFirst || isLast) ? "10px" : stop.isPass ? "7px" : "9px";

  // format times for display
  const scheduled = formatScheduleTime(stop.scheduledTime);
  const hasDelay = stop.variation !== null && stop.variation > 0;

  return (
    <Flex px={4} minH="48px" bg={isLiveEvent ? "orange.50" : "transparent"} transition="background 0.3s">
      <Flex direction="column" align="center" w="24px" flexShrink={0} mr={3}>
        {!isFirst && <Box w="2px" flex="1" bg="blue.100" minH="8px" />}

        <Tooltip label={isLiveEvent ? "Live position" : stop.isPass ? "Pass" : isFirst ? "Origin" : isLast ? "Destination" : "Stop"} fontSize="xs">
          <Box
            w={dotSize}
            h={dotSize}
            borderRadius={stop.isPass && !isLiveEvent ? "1px" : "full"}
            transform={stop.isPass && !isLiveEvent ? "rotate(45deg)" : "none"}
            bg={dotColor}
            border="2px solid"
            borderColor={isLiveEvent ? "orange.200" : isFirst ? "green.200" : isLast ? "red.200" : "blue.100"}
            flexShrink={0}
            zIndex={1}
            boxShadow={isLiveEvent ? "0 0 0 3px rgba(237, 137, 54, 0.3)" : "none"}
          />
        </Tooltip>

        {!isLast && <Box w="2px" flex="1" bg="blue.100" minH="8px" />}
      </Flex>

      <Box flex={1} py={2} borderBottomWidth={isLast ? "0" : "1px"} borderColor="gray.100">
        <Flex align="center" gap={2} mb={1}>
          <Text
            fontSize="xs"
            fontWeight={isFirst || isLast || isLiveEvent ? "700" : "600"}
            color={isLiveEvent ? "orange.700" : isFirst || isLast ? "gray.800" : "gray.700"}
            isTruncated
          >
            {stop.name}
          </Text>
          <Badge fontSize="0.55em" colorScheme="gray" variant="subtle" fontFamily="mono" px={1}>
            {stop.tiploc}
          </Badge>
          {isLiveEvent && (
            <Badge fontSize="0.55em" colorScheme="orange" variant="subtle" px={1}>
              LIVE
            </Badge>
          )}
        </Flex>

        {/* timing row */}
        <HStack spacing={2} fontSize="xs">
          <Text w="60px" color="gray.400" fontWeight="600" textTransform="capitalize">
            {stop.eventType}
          </Text>
          <Text fontFamily="mono" color="gray.600" w="42px">
            {scheduled}
          </Text>
          {stop.actualTime && (
            <Text fontFamily="mono" color={hasDelay ? "red.500" : "green.500"} fontWeight="600" w="42px">
              {new Date(stop.actualTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </HStack>

        {/* delay badge */}
        {hasDelay && stop.variation !== null && (
          <Badge mt={1} fontSize="0.6em" colorScheme={stop.variation >= 5 ? "red" : "orange"} variant="subtle" px={1.5}>
            +{stop.variation}m
          </Badge>
        )}
      </Box>
    </Flex>
  );
};

export default TimelineItem;