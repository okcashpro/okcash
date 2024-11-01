# Key Concepts in Eliza

Eliza is a comprehensive and flexible framework for building intelligent agents. It provides a set of tools and abstractions that enable developers to create sophisticated agents tailored to their specific needs. The following concepts are the building blocks of eliza and form the foundation for understanding and working with the framework.

## Actions

Actions define the behaviors or responses an agent can perform in a given context. They contain the logic for handling specific user intents or situations and can be added or modified to extend the agent's capabilities. Actions are a fundamental building block of eliza's extensibility, allowing developers to customize their agents without modifying the underlying framework.

When a user interacts with the agent, the appropriate action is triggered based on the context and the user's input. Actions can perform various tasks, such as generating responses, making API calls, updating the agent's state, or triggering other actions. Developers can create custom actions to define the specific behaviors and functionalities of their agents.

## Evaluators

Evaluators are similar to actions but are invoked after each interaction is stored. They assess the agent's state and provide insights or recommendations on how the agent should proceed. Evaluators analyze the context, user input, and other relevant factors to make decisions or generate additional information.

Evaluators can be used for various purposes, such as sentiment analysis, entity recognition, topic classification, or generating personalized recommendations. By implementing custom evaluators, developers can add advanced reasoning capabilities to their agents and enable them to make informed decisions based on the interaction flow.

## Providers

Providers are components that add context to the agent's interactions by integrating external data sources or APIs. They allow agents to access and utilize relevant information during interactions, enhancing the agent's knowledge and capabilities. Providers can be used to retrieve data from databases, invoke external services, or fetch real-time information.

For example, a weather provider can be implemented to provide the agent with current weather information based on the user's location. Similarly, a product catalog provider can be used to retrieve product details and recommendations based on the user's preferences. Providers enable agents to deliver more accurate and informative responses by incorporating external data sources.

## State and Context

Eliza emphasizes the importance of maintaining state and context to ensure coherent and contextually relevant interactions. The state represents a snapshot of the agent's current situation, capturing essential information such as user details, recent interactions, goals, and relevant facts. It provides a comprehensive view of the current context and helps the agent make informed decisions.

The context is derived from the state and represents the information that is sent to the AI model for response generation. It includes relevant details from the state, such as the user's input, previous interactions, and any additional contextual information required by the AI model. The context is dynamically generated based on the current state and is used to guide the AI model in generating appropriate responses.

## Memories

Memories enable agents to store and retrieve interaction-related data. They are stored in the database as `Memory` objects and are managed by the `MemoryManager` class. Memories can be of different types, such as messages, facts, and lore, each serving a specific purpose.

Messages represent the user inputs and agent responses that form the interaction history. They contain information such as the user ID, content, and associated action. Facts represent the knowledge or information derived from the interactions. They can be used to store key insights, important details, or conclusions drawn from the interactions.

Lore is another type of memory that represents the contextual knowledge or information that the agent can access and retrieve during interactions. It can include a wide range of data, such as product information, FAQs, historical facts, domain-specific knowledge, or even creative content like stories or character backgrounds. Lore enables agents to provide informed and relevant responses by incorporating pre-existing knowledge.

Developers can extend the memory system by adding custom memory types to suit their specific requirements. The `MemoryManager` class provides methods for storing, retrieving, and managing memories efficiently.

## Messages

Messages are the core unit of communication between users and agents in eliza. They are represented as objects that contain information such as the user ID, content, and associated action. Messages are exchanged between users and agents during interactions and form the basis for understanding and response generation.

When a user sends a message, it is processed by the agent, triggering the appropriate actions and evaluators. The agent analyzes the message content, extracts relevant information, and generates a response based on the defined behaviors and rules. Messages can also be stored as memories to maintain a history of the interactions and enable the agent to refer back to previous exchanges.

## Goals

Goals represent high-level objectives or tasks that the agent aims to accomplish during its interactions. They provide a way to guide the agent's behavior towards specific outcomes and enable the agent to make decisions aligned with the desired results. Goals can be defined and tracked using the eliza framework.

For example, in a task-oriented scenario, a goal could be to assist the user in completing a specific task or answering their question satisfactorily. The agent can break down the goal into smaller sub-goals or steps and work towards achieving them throughout the interaction. By defining and tracking goals, agents can adapt their behavior, ask relevant questions, and provide targeted responses to help users accomplish their objectives.

## Relationships

Relationships capture the connections and associations between entities in the agent's domain. They represent the social dynamics, roles, and interactions between users, objects, or other entities. Relationships enable agents to personalize interactions and maintain a coherent understanding of the domain.

In eliza, relationships can be defined and managed using the `Relationship` object. It contains information such as the IDs of the related entities, the type of relationship (e.g., user-user, user-object), and any additional metadata relevant to the relationship.

By understanding and utilizing relationships, agents can tailor their responses, provide personalized recommendations, and maintain a contextually appropriate interaction flow. Relationships can also be used to enforce access controls, permissions, and domain-specific constraints.

## Stateful vs. Stateless Pattern

Eliza supports both stateful and stateless patterns for managing the agent's state, providing flexibility to developers based on their specific requirements. The choice between stateful and stateless patterns depends on factors such as the nature of the agent's domain, the level of personalization required, and the scalability needs of the application.

In the stateful pattern, the agent maintains a persistent state throughout its interactions. It retains the context and history across multiple exchanges, allowing for more complex and personalized interactions. The stateful pattern is particularly useful when dealing with multi-turn dialogues, user-specific preferences, or scenarios that require tracking long-term information.

On the other hand, the stateless pattern treats each interaction as independent and self-contained. The agent does not maintain a persistent state across interactions, and each request is processed in isolation. Stateless agents rely solely on the information provided in the current input and external data sources to generate responses. This pattern offers simplicity and scalability, as it eliminates the need to manage and store interaction-specific data.

Eliza provides the flexibility to adopt either approach or even combine them based on the specific requirements of the agent. Developers can choose the appropriate pattern based on their needs and design their agents accordingly.

## Database Adapters

Eliza includes database adapters to enable seamless integration with various storage systems. The default adapter supports Supabase, a cloud-based database service, allowing agents to persist and retrieve interaction-related data. However, the framework's modular design allows developers to create custom database adapters to integrate with other databases or storage solutions that best fit their needs.

Database adapters abstract the underlying storage mechanisms, providing a consistent interface for querying and manipulating data related to the agent's interactions. They handle tasks such as storing and retrieving memories, managing goals and relationships, and persisting other relevant information.

By using database adapters, developers can focus on building the agent's logic and capabilities without concerning themselves with the intricacies of data storage and retrieval. The adapters provide a layer of abstraction, allowing developers to switch between different storage solutions or migrate their data easily.
