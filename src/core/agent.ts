import {
  Action,
  BgentRuntime,
  defaultActions
} from "bgent";
import { UUID } from "crypto";
import { EventEmitter } from "events";
import elaborate_discord from "../actions/elaborate.ts";
import joinvoice from "../actions/joinvoice.ts";
import leavevoice from "../actions/leavevoice.ts";
import { adapter } from "./db.ts";
import channelStateProvider from "../providers/channelState.ts";
import flavorProvider from "../providers/flavor.ts";
import timeProvider from "../providers/time.ts";
import voiceStateProvider from "../providers/voicestate.ts";
import settings from "./settings.ts";
import LlamaService from "../services/llama.ts";

export class Agent extends EventEmitter {
  runtime: BgentRuntime;

  constructor() {
    super();
    this.runtime = new BgentRuntime({
      databaseAdapter: adapter,
      token: settings.OPENAI_API_KEY as string,
      serverUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
      evaluators: [],
      providers: [
        channelStateProvider,
        voiceStateProvider,
        timeProvider,
        // flavorProvider, // TODO: re-implement this
      ],
      actions: [
        // elaborate_discord,
        ...defaultActions.filter(
          (action: Action) => action.name !== "ELABORATE"
        ),
        // TODO: Handle elaborating on Discord but *not* on Twitter
        joinvoice,
        leavevoice,
      ],
    });

    // if settings.OPENAI_API_KEY is set, don't use Llama
    if (settings.OPENAI_API_KEY)
      return;

    // Otherwise, initialize Llama

    const llamaService = new LlamaService();
    (async () => {
      await llamaService.initialize()
      // TODO: Only initialize Llama if no OpenAI key is provided
      const completion = async ({ context, stop, model, frequency_penalty, presence_penalty, temperature, }: { context?: string; stop?: never[]; model?: string; frequency_penalty?: number; presence_penalty?: number; temperature?: number; }) => {
        console.log("Running llama completion service");
        console.log("Context: ", context);
        const completionResponse = await llamaService.getCompletionResponse(context, temperature, stop, frequency_penalty, presence_penalty);
        console.log("Completion response: ", completionResponse);
        // change the 'responseMessage' to 'content'
        (completionResponse as any).content = completionResponse.responseMessage;
        delete completionResponse.responseMessage;
        return JSON.stringify(completionResponse);
      }
      this.runtime.completion = completion;

      const embed = async (input: string): Promise<number[]> => {
        console.log("Running llama embed service");
        console.log("Input: ", input);
        return await llamaService.getEmbeddingResponse(input);
      }
      this.runtime.embed = embed;
    })();
  }

  async ensureUserExists(
    user_id: UUID,
    userName: string | null
  ) {
    const data = adapter.db
      .prepare("SELECT * FROM accounts WHERE id = ?")
      .get(user_id);

    if (!data) {
      if (userName) {
        const data = adapter.db
          .prepare("SELECT * FROM accounts WHERE name = ?")
          .get(userName);
        if (data) {
          adapter.db
            .prepare("UPDATE accounts SET id = ? WHERE name = ?")
            .run(user_id, userName);
          console.log(`User ${userName} updated successfully.`);
          return;
        }
      }

      adapter.db
        .prepare(
          "INSERT INTO accounts (id, name, email, details) VALUES (?, ?, ?, ?)"
        )
        .run(
          user_id,
          userName || "Bot",
          (userName || "Bot") + "@discord",
          JSON.stringify({ summary: "" })
        );

      console.log(`User ${userName} created successfully.`);
    }
  }

  async ensureRoomExists(roomId: UUID) {
    const data = adapter.db
      .prepare("SELECT * FROM rooms WHERE id = ?")
      .get(roomId);

    if (!data) {
      adapter.db.prepare("INSERT INTO rooms (id) VALUES (?)").run(roomId);
      console.log(`Room ${roomId} created successfully.`);
    }
  }

  async ensureParticipantInRoom(user_id: UUID, roomId: UUID) {
    const data = adapter.db
      .prepare("SELECT * FROM participants WHERE user_id = ? AND room_id = ?")
      .get(user_id, roomId);

    if (!data) {
      adapter.db
        .prepare("INSERT INTO participants (user_id, room_id) VALUES (?, ?)")
        .run(user_id, roomId);
      console.log(`User ${user_id} linked to room ${roomId} successfully.`);
    }
  }
}