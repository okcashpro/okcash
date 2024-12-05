import { SlackClientContext, SlackMessage } from '../types/slack-types';

export class SendMessageAction {
  constructor(private context: SlackClientContext) {}

  public async execute(message: SlackMessage): Promise<boolean> {
    try {
      const result = await this.context.client.chat.postMessage({
        channel: message.channelId,
        text: message.text,
        thread_ts: message.threadTs,
      });

      return result.ok === true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }
}