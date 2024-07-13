import {
    Action,
    BgentRuntime,
    defaultActions
} from "bgent";
import { UUID } from "crypto";
import { EventEmitter } from "events";
import elaborate_discord from "./actions/elaborate.ts";
import joinvoice from "./actions/joinvoice.ts";
import leavevoice from "./actions/leavevoice.ts";
import { adapter } from "./db.ts";
import channelStateProvider from "./providers/channelState.ts";
import flavorProvider from "./providers/flavor.ts";
import timeProvider from "./providers/time.ts";
import voiceStateProvider from "./providers/voicestate.ts";
import settings from "./settings.ts";

export class Agent extends EventEmitter {
    runtime: BgentRuntime;
  
    constructor() {
      super();
      this.runtime = new BgentRuntime({
        databaseAdapter: adapter,
        token: settings.OPENAI_API_KEY as string,
        serverUrl: "https://api.openai.com/v1",
        model: "gpt-4o",
        evaluators: [],
        providers: [
          channelStateProvider,
          voiceStateProvider,
          timeProvider,
          flavorProvider,
        ],
        actions: [
          ...defaultActions.filter(
            (action: Action) => action.name !== "ELABORATE"
          ),
          elaborate_discord,
          joinvoice,
          leavevoice,
        ],
      });
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