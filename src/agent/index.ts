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
import askClaude from "../actions/ask_claude.ts";
import mute_room from "../actions/mute_room.ts";
import unmute_room from "../actions/unmute_room.ts";
import follow_room from "../actions/follow_room.ts";
import unfollow_room from "../actions/unfollow_room.ts";

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
      ],
      actions: [
        elaborate,
        joinvoice,
        leavevoice,
        askClaude,
        mute_room,
        unmute_room,
        follow_room,
        unfollow_room,
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
    console.log(`Ensuring participant ${user_id} in room ${roomId}`);
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
