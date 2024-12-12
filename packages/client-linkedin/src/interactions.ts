import {
  composeContext,
  generateMessageResponse,
  generateShouldRespond,
  messageCompletionFooter,
  shouldRespondFooter,
  ModelClass,
  stringToUuid,
  elizaLogger
} from '@ai16z/eliza';

const linkedInMessageTemplate = `{{timeline}}

# Knowledge
{{knowledge}}

About {{agentName}} (LinkedIn Profile):
{{bio}}
{{headline}}
{{summary}}
{{postDirections}}

{{providers}}

Recent interactions:
{{recentInteractions}}

# Task: Generate a professional response in the voice and style of {{agentName}}
Current Message:
{{currentMessage}}

Conversation History:
{{conversationHistory}}

{{actions}}

# Task: Generate a response in the voice and style of {{agentName}}. Include an action, if appropriate. {{actionNames}}:` + messageCompletionFooter;

const linkedInShouldRespondTemplate = `# INSTRUCTIONS: Determine if {{agentName}} should respond to the message and participate in the conversation.

Response options are RESPOND, IGNORE and STOP.

{{agentName}} should:
- RESPOND to messages that are directly addressed to them
- RESPOND to professional networking opportunities
- RESPOND to industry-relevant discussions
- IGNORE messages that are irrelevant to their professional focus
- IGNORE spam or promotional content
- STOP if the conversation is concluded
- STOP if asked to stop

Recent interactions:
{{recentInteractions}}

Current Message:
{{currentMessage}}

Conversation History:
{{conversationHistory}}

# INSTRUCTIONS: Respond with [RESPOND] if {{agentName}} should respond, [IGNORE] if {{agentName}} should not respond, or [STOP] if {{agentName}} should end the conversation.` + shouldRespondFooter;

export class LinkedInInteractionClient {
  private client: any;
  private runtime: any;

  constructor(client: any, runtime: any) {
    this.client = client;
    this.runtime = runtime;
  }

  async start() {
    const handleLinkedInInteractionsLoop = () => {
      this.handleLinkedInInteractions();
      setTimeout(
        handleLinkedInInteractionsLoop,
        (Math.floor(Math.random() * (15 - 5 + 1)) + 5) * 60 * 1000
      );
    };

    handleLinkedInInteractionsLoop();
  }

  async handleLinkedInInteractions() {
    elizaLogger.log('Checking LinkedIn interactions');

    try {
      // Check messages
      const messages = await this.client.linkedInClient.getMessages();
      for (const message of messages) {
        await this.handleMessage(message);
      }

      // Check post comments
      const posts = await this.client.linkedInClient.getFeedPosts();
      for (const post of posts) {
        if (post.authorId === this.client.profile.id) {
          const comments = await this.client.linkedInClient.getPostComments(post.id);
          for (const comment of comments) {
            await this.handleComment(comment, post);
          }
        }
      }
    } catch (error) {
      elizaLogger.error('Error handling LinkedIn interactions:', error);
    }
  }

  private async handleMessage(message: any) {
    if (message.senderId === this.client.profile.id) {
      return;
    }

    const roomId = stringToUuid(`linkedin-conversation-${message.conversationId}`);
    const state = await this.runtime.composeState(
      {
        userId: stringToUuid(message.senderId),
        roomId,
        agentId: this.runtime.agentId,
        content: {
          text: message.text,
          action: ''
        }
      },
      {
        currentMessage: message.text,
        conversationHistory: await this.getConversationHistory(message.conversationId)
      }
    );

    const shouldRespondContext = composeContext({
      state,
      template: this.runtime.character.templates?.linkedInShouldRespondTemplate || linkedInShouldRespondTemplate
    });

    const shouldRespond = await generateShouldRespond({
      runtime: this.runtime,
      context: shouldRespondContext,
      modelClass: ModelClass.MEDIUM
    });

    if (shouldRespond !== 'RESPOND') {
      elizaLogger.log('Not responding to message');
      return;
    }

    const responseContext = composeContext({
      state,
      template: this.runtime.character.templates?.linkedInMessageTemplate || linkedInMessageTemplate
    });

    const response = await generateMessageResponse({
      runtime: this.runtime,
      context: responseContext,
      modelClass: ModelClass.MEDIUM
    });

    if (response.text) {
      try {
        await this.client.linkedInClient.sendMessage(message.conversationId, response.text);
        
        await this.runtime.messageManager.createMemory({
          id: stringToUuid(`${Date.now()}-${this.runtime.agentId}`),
          userId: this.runtime.agentId,
          content: {
            text: response.text,
            source: 'linkedin',
            action: response.action
          },
          agentId: this.runtime.agentId,
          roomId,
          createdAt: Date.now()
        });
      } catch (error) {
        elizaLogger.error('Error sending LinkedIn message:', error);
      }
    }
  }

  private async handleComment(comment: any, post: any) {
    if (comment.authorId === this.client.profile.id) {
      return;
    }

    const roomId = stringToUuid(`linkedin-post-${post.id}`);
    const state = await this.runtime.composeState(
      {
        userId: stringToUuid(comment.authorId),
        roomId,
        agentId: this.runtime.agentId,
        content: {
          text: comment.text,
          action: ''
        }
      },
      {
        currentMessage: comment.text,
        conversationHistory: await this.getPostCommentHistory(post.id)
      }
    );

    const shouldRespondContext = composeContext({
      state,
      template: this.runtime.character.templates?.linkedInShouldRespondTemplate || linkedInShouldRespondTemplate
    });

    const shouldRespond = await generateShouldRespond({
      runtime: this.runtime,
      context: shouldRespondContext,
      modelClass: ModelClass.MEDIUM
    });

    if (shouldRespond !== 'RESPOND') {
      elizaLogger.log('Not responding to comment');
      return;
    }

    const responseContext = composeContext({
      state,
      template: this.runtime.character.templates?.linkedInMessageTemplate || linkedInMessageTemplate
    });

    const response = await generateMessageResponse({
      runtime: this.runtime,
      context: responseContext,
      modelClass: ModelClass.MEDIUM
    });

    if (response.text) {
      try {
        await this.client.linkedInClient.replyToComment(post.id, comment.id, response.text);
        
        await this.runtime.messageManager.createMemory({
          id: stringToUuid(`${Date.now()}-${this.runtime.agentId}`),
          userId: this.runtime.agentId,
          content: {
            text: response.text,
            source: 'linkedin',
            action: response.action
          },
          agentId: this.runtime.agentId,
          roomId,
          createdAt: Date.now()
        });
      } catch (error) {
        elizaLogger.error('Error replying to LinkedIn comment:', error);
      }
    }
  }

  private async getConversationHistory(conversationId: string): Promise<string> {
    const messages = await this.client.linkedInClient.getConversationMessages(conversationId);
    return messages.map((msg: any) => 
      `${msg.senderName} (${new Date(msg.timestamp).toLocaleString()}): ${msg.text}`
    ).join('\n\n');
  }

  private async getPostCommentHistory(postId: string): Promise<string> {
    const comments = await this.client.linkedInClient.getPostComments(postId);
    return comments.map((comment: any) =>
      `${comment.authorName} (${new Date(comment.timestamp).toLocaleString()}): ${comment.text}`
    ).join('\n\n');
  }
}