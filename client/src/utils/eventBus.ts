import mitt from 'mitt';
import type { EventMap } from '../types/events';

/**
 * Global event bus for cross-module communication.
 *
 * Usage:
 *   import { eventBus } from '@/utils/eventBus';
 *
 *   // Emit an event (from your module)
 *   eventBus.emit('asl:recognized', prediction);
 *
 *   // Subscribe to an event (from another module)
 *   eventBus.on('asl:recognized', (prediction) => { ... });
 *
 *   // Unsubscribe (in useEffect cleanup)
 *   eventBus.off('asl:recognized', handler);
 */
export const eventBus = mitt<EventMap>();
