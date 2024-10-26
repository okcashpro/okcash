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
import multer, { File } from 'multer';
import { Request as ExpressRequest } from 'express';
import { generateCaption, generateImage } from "../../actions/image_gen_utils.ts";

const upload = multer({ storage: multer.memoryStorage() });

export const messageHandlerTemplate =
  // {{goals}}
//   `# Action Examples
// {{actionExamples}}
// (Action examples are for reference only. Do not use the information from them in your response.)

`# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

{{messageDirections}}

{{recentMessages}}

# Instructions: Write the next message for {{agentName}}. Ignore "action".
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

// Define an interface that extends the Express Request interface
interface CustomRequest extends ExpressRequest {
  file: File;
}

// Update the route handler to use CustomRequest instead of express.Request
this.app.post("/:agentId/whisper", upload.single('file'), async (req: CustomRequest, res: express.Response) => {
  const audioFile = req.file; // Access the uploaded file using req.file
  const agentId = req.params.agentId;

  if (!audioFile) {
    res.status(400).send("No audio file provided");
    return;
  }

  let agent = this.agents.get(agentId);

  // if agent is null, look for agent with the same name
  if (!agent) {
    agent = Array.from(this.agents.values()).find((a) => a.character.name.toLowerCase() === agentId.toLowerCase());
  }

  if (!agent) {
    res.status(404).send("Agent not found");
    return;
  }

  const formData = new FormData();
  const audioBlob = new Blob([audioFile.buffer], { type: audioFile.mimetype });
  formData.append('file', audioBlob, audioFile.originalname);
  formData.append('model', 'whisper-1');

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${agent.token}`,
    },
    body: formData,
  });

  const data = await response.json();
  res.json(data);
});

    this.app.post("/:agentId/message", async (req: express.Request, res: express.Response) => {
      let agentId = req.params.agentId;
      const roomId = stringToUuid(req.body.roomId ?? ("default-room-" + agentId));
      const userId = stringToUuid(req.body.userId ?? "user");
      
      let agent = this.agents.get(agentId);

      // if agent is null, look for agent with the same name
      if (!agent) {
        agent = Array.from(this.agents.values()).find((a) => a.character.name.toLowerCase() === agentId.toLowerCase());
      }

      if (!agent) {
        res.status(404).send("Agent not found");
        return;
      }

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

      const response = await agent.messageCompletion({
        context,
        model: 'gpt-4o-mini',
        stop: [],
      });

      // save response to memory
      const responseMessage = {
        ...userMessage,
        userId: agent.agentId,
        content: response,
      };

      await agent.messageManager.createMemory(responseMessage);

      if (!response) {
        res.status(500).send("No response from runtime.messageCompletion");
        return;
      }

      res.json(response);
    });

    this.app.post("/:agentId/image", async (req: express.Request, res: express.Response) => {
      const { prompt, width, height, steps, count } = req.body;
      const agentId = req.params.agentId;
      const agent = this.agents.get(agentId);
      if (!agent) {
        res.status(404).send("Agent not found");
        return;
      }

      const togetherApiKey = agent.getSetting("TOGETHER_API_KEY");
      const claudeApiKey = agent.getSetting("CLAUDE_API_KEY");
      
      const images = await generateImage({...req.body, apiKey: togetherApiKey });
      const imagesRes: {image: string, caption: string}[] = [];
      if (images.data.length > 0) {
        for(let i = 0; i < images.data.length; i++) {
          const caption = await generateCaption({apiKey: claudeApiKey, imageUrl: images.data[i].url});
          if (caption.success) {
            imagesRes.push({image: images.data[i].url, caption: caption.caption});
          } else {
            imagesRes.push({image: images.data[i].url, caption: "Uncaptioned image"});
          }
        }
      }
      res.json({images: imagesRes});
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