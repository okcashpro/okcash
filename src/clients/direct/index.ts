import bodyParser from "body-parser";
import express from "express";
import { composeContext } from "../../core/context.ts";
import { AgentRuntime } from "../../core/runtime.ts";
import {
  Content,
  Memory,
  State
} from "../../core/types.ts";
import { stringToUuid } from "../../core/uuid.ts";
import cors from "cors";
import { messageCompletionFooter } from "../../core/parsing.ts";

export const messageHandlerTemplate =
  // {{goals}}
  `# Action Examples
{{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Relevant facts that {{agentName}} knows:
{{relevantFacts}}

# Recent facts that {{agentName}} has learned:
{{recentFacts}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

Examples of {{agentName}}'s dialog and actions:
{{characterMessageExamples}}

{{providers}}

{{attachments}}

{{actions}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

{{messageDirections}}

{{recentMessages}}

# Instructions: Write the next message for {{agentName}}. Include an action, if appropriate. {{actionNames}}
` + messageCompletionFooter;



export interface SimliClientConfig {
  apiKey: string
  faceID: string
  handleSilence: boolean
  videoRef: any
  audioRef: any
}
class DirectClient {
  private app: express.Application;
  private agents: Map<string, AgentRuntime>;

  constructor() {
    this.app = express();
    this.app.use(cors());
    this.agents = new Map();

    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));

    this.app.post("/:agentId/message", async (req: express.Request, res: express.Response) => {
      let agentId = req.params.agentId;
      const roomId = stringToUuid(req.body.roomId ?? "default-room");
      const userId = stringToUuid(req.body.userId ?? "user");
      
      let agent = this.agents.get(agentId);
      console.log("this.agents", Array.from(this.agents.values()).map((a) => a.character.name));

      // if agent is null, look for agent with the same name
      if (!agent) {
        agent = Array.from(this.agents.values()).find((a) => a.character.name.toLowerCase() === agentId.toLowerCase());
      }

      if (!agent) {
        res.status(404).send("Agent not found");
        return;
      }

      console.log("agent.agentId", agent.agentId)

      await Promise.all([
        agent.ensureUserExists(
          agent.agentId,
          agent.character.name ?? "Agent",
          agent.character.name ?? "Agent",
          "direct",
        ),
        agent.ensureUserExists(userId, req.body.userName ?? "User", req.body.name ?? "User", "direct"),
        agent.ensureRoomExists(roomId),
      ]);

      await Promise.all([
        agent.ensureParticipantInRoom(userId, roomId),
        agent.ensureParticipantInRoom(agent.agentId, roomId),
      ]);

      const text = req.body.text;
      const messageId = stringToUuid(Date.now().toString());

      const content: Content = {
        text,
        attachments: [],
        source: "direct",
        inReplyTo: undefined,
      };

      const userMessage = { content, userId, roomId };

      const memory: Memory = {
        id: messageId,
        ...userMessage,
        userId,
        roomId,
        content,
        createdAt: Date.now(),
      };

      await agent.messageManager.createMemory(memory);


      const state = (await agent.composeState(userMessage, {
        agentName: agent.character.name,
      })) as State;

      const context = composeContext({
        state,
        template: messageHandlerTemplate,
      });

      console.log("context", context);

      const response = await agent.messageCompletion({
        context,
        model: 'gpt-4o-mini',
        stop: [],
      });

      // save response to memory
      const responseMessage = {
        ...userMessage,
        content: response,
      };

      await agent.messageManager.createMemory(responseMessage);

      if (!response) {
        res.status(500).send("No response from runtime.messageCompletion");
        return;
      }

      res.json(response);
    });
  }

  public registerAgent(agent: AgentRuntime) {
    this.agents.set(agent.agentId, agent);
  }

  public unregisterAgent(agent: AgentRuntime) {
    this.agents.delete(agent.agentId);
  }

  public start(port: number) {
    this.app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}/`);
    });
  }
}

export default DirectClient;