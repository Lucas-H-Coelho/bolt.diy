import { EventEmitter } from 'events';
import Redis from 'ioredis';

export class MessageBus extends EventEmitter {
  private static instance: MessageBus;
  private redis: Redis;
  private subscribers: Map<string, Set<string>> = new Map();
  private logger: Logger;

  private constructor() {
    super();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('MessageBus');
    this.setupRedisSubscriptions();
  }

  static getInstance(): MessageBus {
    if (!MessageBus.instance) {
      MessageBus.instance = new MessageBus();
    }
    return MessageBus.instance;
  }

  async start(): Promise<void> {
    this.logger.info('Starting Message Bus');

    // Subscribe to Redis channels for distributed events
    await this.redis.subscribe('bolt:events');

    this.redis.on('message', (channel, message) => {
      try {
        const { event, data } = JSON.parse(message);
        this.emit(event, data);
      } catch (error) {
        this.logger.error('Failed to parse message', { error, message });
      }
    });

    this.logger.info('Message Bus started');
  }

  async publish(event: string, data: any): Promise<void> {
    try {
      // Emit locally
      this.emit(event, data);

      // Publish to Redis for other instances
      await this.redis.publish('bolt:events', JSON.stringify({ event, data }));

      this.logger.debug('Event published', { event, data });
    } catch (error) {
      this.logger.error('Failed to publish event', { error, event });
    }
  }

  subscribe(event: string, callback: (data: any) => void): void {
    this.on(event, callback);
  }

  unsubscribe(event: string, callback: (data: any) => void): void {
    this.off(event, callback);
  }
}
