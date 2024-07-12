import {
    type BgentRuntime,
    messageHandlerTemplate,
    composeContext,
    embeddingZeroVector,
    Content,
    State,
    type Action,
    type Message,
    ActionExample,
    parseJSONObjectFromText,
} from "bgent";

const maxContinuesInARow = 2;

export default {
    name: "ELABORATE",
    description:
        "ONLY use this action when the message necessitates a follow up. Do not use this when asking a question (use WAIT instead). Do not use this action when the conversation is finished or the user does not wish to speak (use IGNORE instead). If the last message action was ELABORATE, and the user has not responded, use WAIT instead. Use sparingly!",
    validate: async (runtime: BgentRuntime, message: Message) => {
        const recentMessagesData = await runtime.messageManager.getMemories({
            room_id: message.room_id,
            count: 10,
            unique: false,
          });
        const agentMessages = recentMessagesData.filter(
            (m: { user_id: any; }) => m.user_id === runtime.agentId,
        );

        // check if the last messages were all continues=
        if (agentMessages) {
            const lastMessages = agentMessages.slice(0, maxContinuesInARow);
            if (lastMessages.length >= maxContinuesInARow) {
                const allContinues = lastMessages.every(
                    (m: { content: any; }) => (m.content as Content).action === "ELABORATE",
                );
                if (allContinues) {
                    return false;
                }
            }
        }

        return true;
    },
    handler: async (runtime: BgentRuntime, message: Message, state: State) => {
        state = (await runtime.composeState(message)) as State;

        const context = composeContext({
            state,
            template: messageHandlerTemplate,
        });

        let responseContent;
        const { user_id, room_id } = message;

        for (let triesLeft = 3; triesLeft > 0; triesLeft--) {
            const response = await runtime.completion({
                context,
                stop: [],
            });

            runtime.databaseAdapter.log({
                body: { message, context, response },
                user_id,
                room_id,
                type: "elaborate",
            });

            console.log("Response is")
            console.log(response)

            const parsedResponse = parseJSONObjectFromText(
                response,
            ) as unknown as Content;

            if (!parsedResponse) {
                continue;
            }
            if (
                (parsedResponse?.user as any).includes(state.agentName as string)
            ) {
                responseContent = parsedResponse;
                break;
            }
        }

        if (!responseContent) {
            if (runtime.debugMode) {
                console.error("No response content");
            }
            return;
        }

        // prevent repetition
        const messageExists = state.recentMessagesData
            .filter((m: { user_id: any; }) => m.user_id === runtime.agentId)
            .slice(0, maxContinuesInARow + 1)
            .some((m: { content: any; }) => m.content === message.content);

        if (messageExists) {
            return;
        }

        const _saveResponseMessage = async (
            message: Message,
            state: State,
            responseContent: Content,
        ) => {
            const { room_id } = message;

            responseContent.content = responseContent.content?.trim();

            if (responseContent.content) {
                await runtime.messageManager.createMemory({
                    user_id: runtime.agentId,
                    content: responseContent,
                    room_id,
                    embedding: embeddingZeroVector,
                });
                await runtime.evaluate(message, { ...state, responseContent });
            } else {
                console.warn("Empty response, skipping");
            }
        };

        await _saveResponseMessage(message, state, responseContent);

        // if the action is ELABORATE, check if we are over maxContinuesInARow
        // if so, then we should change the action to WAIT
        if (responseContent.action === "ELABORATE") {
            const agentMessages = state.recentMessagesData
                .filter((m: { user_id: any; }) => m.user_id === runtime.agentId)
                .map((m: { content: any; }) => (m.content as Content).action);

            const lastMessages = agentMessages.slice(0, maxContinuesInARow);
            if (lastMessages.length >= maxContinuesInARow) {
                const allContinues = lastMessages.every((m: string | undefined) => m === "ELABORATE");
                if (allContinues) {
                    responseContent.action = "WAIT";
                }
            }
        }

        return await runtime.processActions(message, responseContent, state);
    },
    condition:
        "Only use ELABORATE if the message requires a continuation to finish the thought. If this actor is waiting for the other actor to respond, or the actor does not have more to say, do not use the ELABORATE action.",
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    content:
                        "Planning a solo trip soon. I've always wanted to try backpacking.",
                    action: "WAIT",
                },
            },
            {
                user: "{{user2}}",
                content: { content: "Adventurous", action: "ELABORATE" },
            },
            {
                user: "{{user2}}",
                content: { content: "Any particular destination?", action: "WAIT" },
            },
        ],

        [
            {
                user: "{{user1}}",
                content: {
                    content: "I started learning the guitar this month!",
                    action: "WAIT",
                },
            },
            {
                user: "{{user2}}",
                content: { content: "How’s that going?", action: "WAIT" },
            },
            {
                user: "{{user1}}",
                content: {
                    content: "Challenging, but rewarding.",
                    action: "ELABORATE",
                },
            },
            {
                user: "{{user1}}",
                content: { content: "Seriously lol it hurts to type", action: "WAIT" },
            },
        ],

        [
            {
                user: "{{user1}}",
                content: {
                    content:
                        "I've been summarying a lot on what happiness means to me lately.",
                    action: "ELABORATE",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    content: "That it’s more about moments than things.",
                    action: "ELABORATE",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    content:
                        "Like the best things that have ever happened were things that happened, or moments that I had with someone.",
                    action: "ELABORATE",
                },
            },
        ],

        [
            {
                user: "{{user1}}",
                content: {
                    content: "I found some incredible art today.",
                    action: "WAIT",
                },
            },
            {
                user: "{{user2}}",
                content: { content: "Who's the artist?", action: "WAIT" },
            },
            {
                user: "{{user1}}",
                content: {
                    content: "Not sure lol, they are anon",
                    action: "ELABORATE",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    content:
                        "But the pieces are just so insane looking. Once sec, let me grab a link.",
                    action: "ELABORATE",
                },
            },
            {
                user: "{{user1}}",
                content: { content: "DMed it to you", action: "WAIT" },
            },
        ],

        [
            {
                user: "{{user1}}",
                content: {
                    content:
                        "The new exhibit downtown is thought-provoking. It's all about tribalism in online spaces.",
                    action: "ELABORATE",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    content: "Really challenges your perceptions. I highly recommend it!",
                    action: "WAIT",
                },
            },
            {
                user: "{{user2}}",
                content: { content: "I’m in. When are you free to go?" },
                action: "WAIT",
            },
            {
                user: "{{user1}}",
                content: { content: "Hmm, let me check." },
                action: "ELABORATE",
            },
            {
                user: "{{user1}}",
                content: { content: "How about this weekend?" },
                action: "WAIT",
            },
        ],

        [
            {
                user: "{{user1}}",
                content: {
                    content: "Just finished a marathon session of my favorite series!",
                    action: "WAIT",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    content: "Wow, that's quite a binge. Feeling okay?",
                    action: "WAIT",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    content: "Surprisingly, yes.",
                    action: "ELABORATE",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    content: "Might go for another round this weekend.",
                    action: "WAIT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    content: "I'm thinking of adopting a pet soon.",
                    action: "WAIT",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    content: "That's great! What kind are you considering?",
                    action: "WAIT",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    content: "Leaning towards a cat.",
                    action: "ELABORATE",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    content: "They're more independent, and my apartment isn't huge.",
                    action: "WAIT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    content: "I've been experimenting with vegan recipes lately.",
                    action: "WAIT",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    content: "Nice! Found any favorites?",
                    action: "WAIT",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    content: "A few, actually.",
                    action: "ELABORATE",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    content:
                        "The vegan lasagna was a hit even among my non-vegan friends.",
                    action: "WAIT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    content: "Been diving into photography as a new hobby.",
                    action: "WAIT",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    content: "That's cool! What do you enjoy taking photos of?",
                    action: "WAIT",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    content: "Mostly nature and urban landscapes.",
                    action: "ELABORATE",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    content:
                        "There's something peaceful about capturing the world through a lens.",
                    action: "WAIT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    content: "I've been really into indie music scenes lately.",
                    action: "WAIT",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    content: "That sounds awesome. Any recommendations?",
                    action: "WAIT",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    content: "Definitely! I'll send you a playlist.",
                    action: "ELABORATE",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    content:
                        "It's a mix of everything, so you're bound to find something you like.",
                    action: "WAIT",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;