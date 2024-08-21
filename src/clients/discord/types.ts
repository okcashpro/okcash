import { UUID } from "crypto";
import { Content } from "../../types.ts"

export type InterestChannels = {
  [key: string]: {
    lastMessageSent: number;
    messages: { user_id: UUID; userName: string; content: Content }[];
  };
};

export enum ResponseType {
  SPOKEN_AUDIO = 0,
  SPOKEN_TEXT = 1,
  RESPONSE_TEXT = 2,
  RESPONSE_AUDIO = 3,
}
