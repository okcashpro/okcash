import { default as getUuid } from "uuid-by-string";
import { UUID } from "../../core/types.ts";

export const twitterGenerateRoomId = getUuid("twitter_generate_room") as UUID;
