import amqp from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

interface PublishOptions {
  correlationId?: string;
}

class RabbitMQClient {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private reconnecting: boolean = false;
  private consumers: Map<string, (msg: amqp.ConsumeMessage | null) => Promise<void>> = new Map();
  private connectionAttempts: number = 0;
  private readonly maxConnectionAttempts: number = 5;


  async connect() {
    try {
      const { RABBITMQ_HOST, RABBITMQ_PORT, RABBITMQ_USERNAME, RABBITMQ_PASSWORD } = process.env;

      const url = `amqp://${RABBITMQ_USERNAME}:${RABBITMQ_PASSWORD}@${RABBITMQ_HOST}:${RABBITMQ_PORT}`;

      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
    } catch (error) {
      console.error('Error connecting to RabbitMQ', error);
    }
  }

  async setup() {
    if (!this.channel) {
      throw new Error('Channel not established');
    }
    await this.channel.assertQueue('get_customer_orders', { durable: false });
    await this.channel.assertQueue('get_customer_orders_response_', { durable: false });
  }


  async consumeMessage(queue: string, callback: (msg: amqp.ConsumeMessage | null) => Promise<void>): Promise<string> {
    if (!this.isConnected()) {
      await this.connect();
    }

    this.consumers.set(queue, callback);

    try {
      await this.channel!.assertQueue(queue, {durable: false});
      const {consumerTag} = await this.channel!.consume(queue, async (msg) => {
        if (msg) {
          try {
            await callback(msg);
            await this.ackMessage(msg);
          } catch (error) {
            console.error(`Error processing message from queue ${queue}:`, error);
            await this.nackMessage(msg);
          }
        }
      }, {noAck: false});

      return consumerTag;
    } catch (error) {
      console.error(`Error setting up consumer for queue ${queue}:`, error);
      throw error;
    }
  }

  async publishMessage(queue: string, message: string, options?: PublishOptions) {
    if (!this.isConnected()) {
      await this.connect();
    }

    try {
      await this.channel!.assertQueue(queue, {durable: false});
      return this.channel!.sendToQueue(queue, Buffer.from(message), options);
    } catch (error) {
      console.error(`Error publishing message to queue ${queue}:`, error);
      throw error;
    }
  }

  async cancelConsume(consumerTag: string): Promise<void> {
    if (this.isConnected()) {
      await this.channel!.cancel(consumerTag);
    }
  }

  async ackMessage(message: amqp.ConsumeMessage) {
    if (this.isConnected()) {
      try {
        await this.channel!.ack(message);
      } catch (error) {
        console.error('Error acknowledging message:', error);
      }
    }
  }

  async nackMessage(msg: amqp.ConsumeMessage, allUpTo: boolean = false, requeue: boolean = true): Promise<void> {
    if (this.isConnected()) {
      try {
        await this.channel!.nack(msg, allUpTo, requeue);
      } catch (error) {
        console.error('Error nack-ing message:', error);
      }
    }
  }

  async closeConnection() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error);
    } finally {
      this.channel = null;
      this.connection = null;
    }
  }
  async removeListener(queue: string) {
    if (this.channel && this.consumers.has(queue)) {
      this.consumers.delete(queue);
    }
  }
  isConnected(): boolean {
    return this.connection !== null && this.channel !== null && !this.connection.close;
  }
}

export const rabbitMQClient = new RabbitMQClient();
