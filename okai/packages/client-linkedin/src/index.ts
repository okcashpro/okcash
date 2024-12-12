import { okaiLogger } from '@okcashpro/okai';
import { ClientBase } from './base';
import { LinkedInPostClient } from './post';
import { LinkedInInteractionClient } from './interactions';
import { validateLinkedInConfig } from './environment';

class LinkedInManager {
  client: ClientBase;
  post: LinkedInPostClient;
  interaction: LinkedInInteractionClient;

  constructor(runtime: any) {
    this.client = new ClientBase(runtime);
    this.post = new LinkedInPostClient(this.client, runtime);
    this.interaction = new LinkedInInteractionClient(this.client, runtime);
  }
}

export const LinkedInClientInterface = {
  async start(runtime: any) {
    await validateLinkedInConfig(runtime);
    okaiLogger.log('LinkedIn client started');

    const manager = new LinkedInManager(runtime);
    await manager.client.init();
    await manager.post.start();
    await manager.interaction.start();

    return manager;
  },

  async stop(runtime: any) {
    okaiLogger.warn('LinkedIn client stop not implemented yet');
  }
};

export default LinkedInClientInterface;