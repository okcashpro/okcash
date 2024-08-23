// TODO: This has issues and needs to be fixed

import { AgentRuntime } from "../core/runtime.ts";
import { Action, Message } from "../core/types.ts";

export default {
  name: "FOLLOW_ROOM",
  description: "Follows a room, bypassing the completion call for deciding whether to respond.",
  validate: async (runtime: AgentRuntime, message: Message) => {
    const roomId = message.room_id;
    const userState = await runtime.databaseAdapter.getParticipantUserState(roomId, runtime.agentId);
    return userState !== 'FOLLOWED';
  },
  handler: async (runtime: AgentRuntime, message: Message) => {
    await runtime.databaseAdapter.setParticipantUserState(message.room_id, runtime.agentId, 'FOLLOWED');
  },
  condition: "The user wants to always respond in a room without first checking with the completion call.",
  examples: [  
    [
      {
        user: "{{user1}}",
        content: {
          content: "Hey {{agentName}}, I'd like you to follow this channel and participate in conversations automatically.",
          action: "WAIT"
        }
      },
      {
        user: "{{agentName}}",  
        content: {
          content: "Understood, I will now follow this room and chime in without needing to be explicitly mentioned.",
          action: "FOLLOW_ROOM"
        }
      },
      {
        user: "{{user2}}",
        content: {
          content: "What does everyone think about the new project proposal?", 
          action: "WAIT"
        }
      },
      {  
        user: "{{agentName}}",
        content: {
          content: "I think the proposal looks promising. I especially liked the part about leveraging AI to streamline our workflows.",
          action: "WAIT" 
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "{{agentName}}, please start automatically participating in discussions in this channel.",
          action: "WAIT" 
        }
      },
      {
        user: "{{agentName}}",
        content: {
          content: "Got it, I'll start following along and engaging in conversations here.",
          action: "FOLLOW_ROOM"
        }
      },
      { 
        user: "{{user2}}",
        content: {
          content: "I'm struggling with the new database migration. Any tips?",
          action: "WAIT"
        }
      },
      {
        user: "{{agentName}}",  
        content: {
          content: "Make sure to backup your data first. Then I recommend using a tool like Flyway or Liquibase to manage the migration scripts.",
          action: "WAIT"
        }
      }
    ]
  ]
} as Action;