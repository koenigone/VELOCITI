import { useRef, useState, useCallback, useEffect } from 'react';
import { Box } from '@chakra-ui/react';

// snap points as percentage of available height (below header)
const SNAP_POINTS = {
  peek: 0.30,   // just search bar visible
  half: 0.50,   // search + some results
  full: 0.88,   // nearly full screen
};

const DRAG_THRESHOLD = 30; // minimum px drag before we consider it a gesture
const VELOCITY_THRESHOLD = 0.4; // px/ms — fast flick snaps to next position

interface BottomSheetProps {
  children: React.ReactNode;
  forceExpand?: boolean; // when true (e.g. train selected), snap to half automatically
}

const BottomSheet = ({ children, forceExpand }: BottomSheetProps) => {
  const [sheetHeight, setSheetHeight] = useState(SNAP_POINTS.half);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const dragStartTime = useRef(0);
  const isDragging = useRef(false);

  // when forceExpand changes (train selected/deselected), snap to half
  useEffect(() => {
    if (forceExpand) {
      setSheetHeight(SNAP_POINTS.half);
    }
  }, [forceExpand]);

  // find nearest snap point
  const snapTo = useCallback((rawHeight: number, velocity: number) => {
    const points = [SNAP_POINTS.peek, SNAP_POINTS.half, SNAP_POINTS.full];

    // fast flick — snap in the direction of the flick
    if (Math.abs(velocity) > VELOCITY_THRESHOLD) {
      const currentIdx = points.findIndex(p => Math.abs(p - dragStartHeight.current) < 0.05);
      if (velocity < 0 && currentIdx < points.length - 1) {
        // flicked up — go to next higher snap
        return points[Math.min(currentIdx + 1, points.length - 1)];
      }
      if (velocity > 0 && currentIdx > 0) {
        // flicked down — go to next lower snap
        return points[Math.max(currentIdx - 1, 0)];
      }
    }

    // slow drag — snap to nearest point
    let closest = points[0];
    let minDist = Math.abs(rawHeight - points[0]);
    for (let i = 1; i < points.length; i++) {
      const dist = Math.abs(rawHeight - points[i]);
      if (dist < minDist) {
        minDist = dist;
        closest = points[i];
      }
    }
    return closest;
  }, []);

  // touch handlers for the drag handle area
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isDragging.current = true;
    dragStartY.current = e.touches[0].clientY;
    dragStartHeight.current = sheetHeight;
    dragStartTime.current = Date.now();
  }, [sheetHeight]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !containerRef.current) return;

    const parentHeight = containerRef.current.parentElement?.clientHeight || window.innerHeight;
    const deltaY = dragStartY.current - e.touches[0].clientY;
    const deltaPercent = deltaY / parentHeight;
    const newHeight = Math.max(SNAP_POINTS.peek, Math.min(SNAP_POINTS.full, dragStartHeight.current + deltaPercent));

    setSheetHeight(newHeight);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const elapsed = Date.now() - dragStartTime.current;
    const deltaY = dragStartY.current - e.changedTouches[0].clientY;
    const velocity = elapsed > 0 ? -deltaY / elapsed : 0; // positive = dragging down

    // only snap if drag exceeded threshold
    if (Math.abs(deltaY) < DRAG_THRESHOLD && Math.abs(velocity) < VELOCITY_THRESHOLD) {
      setSheetHeight(dragStartHeight.current); // return to start
      return;
    }

    const snapped = snapTo(sheetHeight, velocity);
    setSheetHeight(snapped);
  }, [sheetHeight, snapTo]);

  return (
    <Box
      ref={containerRef}
      position="absolute"
      bottom="0"
      left="0"
      right="0"
      h={`${sheetHeight * 100}%`}
      transition={isDragging.current ? "none" : "height 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)"}
      zIndex="1000"
      display="flex"
      flexDirection="column"
    >
      <Box
        bg="white"
        h="full"
        borderTopRadius="xl"
        boxShadow="0 -4px 20px rgba(0,0,0,0.15)"
        display="flex"
        flexDirection="column"
        overflow="hidden"
      >
        {/* draggable handle area */}
        <Box
          pt={2} pb={1}
          display="flex"
          justifyContent="center"
          flexShrink={0}
          cursor="grab"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          _active={{ cursor: "grabbing" }}
          userSelect="none"
        >
          <Box w="36px" h="4px" borderRadius="full" bg="gray.300" />
        </Box>

        {/* content */}
        <Box flex={1} overflow="hidden" display="flex" flexDirection="column">
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default BottomSheet;
