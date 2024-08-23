/* eslint-disable @typescript-eslint/no-explicit-any */
import { UUID } from "crypto";
import { EventEmitter } from "events";
import joinvoice from "../actions/joinvoice.ts";
import leavevoice from "../actions/leavevoice.ts";
import channelStateProvider from "../providers/channelState.ts";
import timeProvider from "../providers/time.ts";
import voiceStateProvider from "../providers/voiceState.ts";
import settings from "../core/settings.ts";
import elaborate from "../actions/elaborate.ts";

import { adapter } from "./db.ts";
import { AgentRuntime } from "../core/runtime.ts";

export class Agent extends EventEmitter {
  runtime: AgentRuntime;

  constructor() {
    super();
    this.runtime = new AgentRuntime({
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
        // TODO: Handle elaborating on Discord but *not* on Twitter
        // (maybe different agents)
        elaborate,
        joinvoice,
        leavevoice,
      ],
    });
  }

  async ensureUserExists(user_id: UUID, userName: string | null) {
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
          "INSERT INTO accounts (id, name, email, details) VALUES (?, ?, ?, ?)",
        )
        .run(
          user_id,
          userName || "Bot",
          (userName || "Bot") + "@discord",
          JSON.stringify({ summary: "" }),
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
