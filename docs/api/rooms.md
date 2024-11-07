# Room Model

The 'room model' represents a physical or virtual space where interactions between agents and users take place.

In a typical user-to-agent conversation, such as in ChatGPT, the conversation can be stored in the database with a key for the user and a key for the agent. When they agent needs to look at the recnt conversation history, they can search the database and filter by the person they are talking to. In a multi-agent environment, the conversation can be a lot more complex, with multiple people joining and leaving the conversation, multiple agents interacting with each other, and more.

The room model is popular in multiplayer gaming, where a room can be associated with a server. For many open-world multiplayer games, the world is divided into chunks that players can move between.

In the context of eliza, a room can be a physical space, such as a chat room, or a virtual space, such as a game world. The room model provides a way to organize interactions, manage participants, and maintain context within a specific environment.

## Key Concepts

### Room

A room contains a list of participants which can be agents or users, and can be added or removed from at any time. The room is keyed by the `room_id`.

### Participant

A participant is an agent or user that is part of the room. Participants are identified by their 'user_id' which is keyed to the account of the user or agent.

### Ensuring that a Room and Participant Exists

Every memory needs to be associated with a room and a participant. On databases where foreign keys are available, we try to enforce this constraint.

When handling messages, you can use the built-in `AgentRuntime.ensureRoomExists(user_id,  room_id)` and `AgentRuntime.ensureParticipantExists()` methods to ensure that the room and participant are correctly set up. A wrapper function has also been added to the runtime to make this easier: `AgentRuntime.ensureConnection(user_id, room_id, user_name, user_screen_name, source)`.
