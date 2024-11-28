// @ts-check
/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const typedocSidebar = {
  items: [
    {
      type: "category",
      label: "Enumerations",
      items: [
        { type: "doc", id: "api/enumerations/Clients", label: "Clients" },
        { type: "doc", id: "api/enumerations/GoalStatus", label: "GoalStatus" },
        { type: "doc", id: "api/enumerations/ModelClass", label: "ModelClass" },
        {
          type: "doc",
          id: "api/enumerations/ModelProviderName",
          label: "ModelProviderName",
        },
        {
          type: "doc",
          id: "api/enumerations/ServiceType",
          label: "ServiceType",
        },
      ],
    },
    {
      type: "category",
      label: "Classes",
      items: [
        { type: "doc", id: "api/classes/AgentRuntime", label: "AgentRuntime" },
        {
          type: "doc",
          id: "api/classes/DatabaseAdapter",
          label: "DatabaseAdapter",
        },
        {
          type: "doc",
          id: "api/classes/MemoryManager",
          label: "MemoryManager",
        },
        { type: "doc", id: "api/classes/Service", label: "Service" },
      ],
    },
    {
      type: "category",
      label: "Interfaces",
      items: [
        { type: "doc", id: "api/interfaces/Account", label: "Account" },
        { type: "doc", id: "api/interfaces/Action", label: "Action" },
        {
          type: "doc",
          id: "api/interfaces/ActionExample",
          label: "ActionExample",
        },
        { type: "doc", id: "api/interfaces/Actor", label: "Actor" },
        { type: "doc", id: "api/interfaces/Content", label: "Content" },
        {
          type: "doc",
          id: "api/interfaces/ConversationExample",
          label: "ConversationExample",
        },
        {
          type: "doc",
          id: "api/interfaces/EvaluationExample",
          label: "EvaluationExample",
        },
        { type: "doc", id: "api/interfaces/Evaluator", label: "Evaluator" },
        { type: "doc", id: "api/interfaces/Goal", label: "Goal" },
        {
          type: "doc",
          id: "api/interfaces/IAgentRuntime",
          label: "IAgentRuntime",
        },
        {
          type: "doc",
          id: "api/interfaces/IBrowserService",
          label: "IBrowserService",
        },
        {
          type: "doc",
          id: "api/interfaces/IDatabaseAdapter",
          label: "IDatabaseAdapter",
        },
        {
          type: "doc",
          id: "api/interfaces/IImageDescriptionService",
          label: "IImageDescriptionService",
        },
        {
          type: "doc",
          id: "api/interfaces/IMemoryManager",
          label: "IMemoryManager",
        },
        { type: "doc", id: "api/interfaces/IPdfService", label: "IPdfService" },
        {
          type: "doc",
          id: "api/interfaces/ISpeechService",
          label: "ISpeechService",
        },
        {
          type: "doc",
          id: "api/interfaces/ITextGenerationService",
          label: "ITextGenerationService",
        },
        {
          type: "doc",
          id: "api/interfaces/ITranscriptionService",
          label: "ITranscriptionService",
        },
        {
          type: "doc",
          id: "api/interfaces/IVideoService",
          label: "IVideoService",
        },
        { type: "doc", id: "api/interfaces/Memory", label: "Memory" },
        {
          type: "doc",
          id: "api/interfaces/MessageExample",
          label: "MessageExample",
        },
        { type: "doc", id: "api/interfaces/Objective", label: "Objective" },
        { type: "doc", id: "api/interfaces/Participant", label: "Participant" },
        { type: "doc", id: "api/interfaces/Provider", label: "Provider" },
        {
          type: "doc",
          id: "api/interfaces/Relationship",
          label: "Relationship",
        },
        { type: "doc", id: "api/interfaces/Room", label: "Room" },
        { type: "doc", id: "api/interfaces/State", label: "State" },
      ],
    },
    {
      type: "category",
      label: "Type Aliases",
      items: [
        { type: "doc", id: "api/type-aliases/Character", label: "Character" },
        { type: "doc", id: "api/type-aliases/Client", label: "Client" },
        { type: "doc", id: "api/type-aliases/Handler", label: "Handler" },
        {
          type: "doc",
          id: "api/type-aliases/HandlerCallback",
          label: "HandlerCallback",
        },
        { type: "doc", id: "api/type-aliases/Media", label: "Media" },
        { type: "doc", id: "api/type-aliases/Model", label: "Model" },
        { type: "doc", id: "api/type-aliases/Models", label: "Models" },
        { type: "doc", id: "api/type-aliases/Plugin", label: "Plugin" },
        { type: "doc", id: "api/type-aliases/UUID", label: "UUID" },
        { type: "doc", id: "api/type-aliases/Validator", label: "Validator" },
      ],
    },
    {
      type: "category",
      label: "Variables",
      items: [
        {
          type: "doc",
          id: "api/variables/defaultCharacter",
          label: "defaultCharacter",
        },
        { type: "doc", id: "api/variables/elizaLogger", label: "elizaLogger" },
        {
          type: "doc",
          id: "api/variables/embeddingDimension",
          label: "embeddingDimension",
        },
        {
          type: "doc",
          id: "api/variables/embeddingZeroVector",
          label: "embeddingZeroVector",
        },
        {
          type: "doc",
          id: "api/variables/evaluationTemplate",
          label: "evaluationTemplate",
        },
        { type: "doc", id: "api/variables/settings", label: "settings" },
      ],
    },
    {
      type: "category",
      label: "Functions",
      items: [
        { type: "doc", id: "api/functions/addHeader", label: "addHeader" },
        {
          type: "doc",
          id: "api/functions/composeActionExamples",
          label: "composeActionExamples",
        },
        {
          type: "doc",
          id: "api/functions/composeContext",
          label: "composeContext",
        },
        { type: "doc", id: "api/functions/createGoal", label: "createGoal" },
        {
          type: "doc",
          id: "api/functions/createRelationship",
          label: "createRelationship",
        },
        { type: "doc", id: "api/functions/embed", label: "embed" },
        {
          type: "doc",
          id: "api/functions/findNearestEnvFile",
          label: "findNearestEnvFile",
        },
        {
          type: "doc",
          id: "api/functions/formatActionNames",
          label: "formatActionNames",
        },
        {
          type: "doc",
          id: "api/functions/formatActions",
          label: "formatActions",
        },
        {
          type: "doc",
          id: "api/functions/formatActors",
          label: "formatActors",
        },
        {
          type: "doc",
          id: "api/functions/formatEvaluatorExampleDescriptions",
          label: "formatEvaluatorExampleDescriptions",
        },
        {
          type: "doc",
          id: "api/functions/formatEvaluatorExamples",
          label: "formatEvaluatorExamples",
        },
        {
          type: "doc",
          id: "api/functions/formatEvaluatorNames",
          label: "formatEvaluatorNames",
        },
        {
          type: "doc",
          id: "api/functions/formatEvaluators",
          label: "formatEvaluators",
        },
        {
          type: "doc",
          id: "api/functions/formatGoalsAsString",
          label: "formatGoalsAsString",
        },
        {
          type: "doc",
          id: "api/functions/formatMessages",
          label: "formatMessages",
        },
        { type: "doc", id: "api/functions/formatPosts", label: "formatPosts" },
        {
          type: "doc",
          id: "api/functions/formatRelationships",
          label: "formatRelationships",
        },
        {
          type: "doc",
          id: "api/functions/formatTimestamp",
          label: "formatTimestamp",
        },
        {
          type: "doc",
          id: "api/functions/generateCaption",
          label: "generateCaption",
        },
        {
          type: "doc",
          id: "api/functions/generateImage",
          label: "generateImage",
        },
        {
          type: "doc",
          id: "api/functions/generateMessageResponse",
          label: "generateMessageResponse",
        },
        {
          type: "doc",
          id: "api/functions/generateObject",
          label: "generateObject",
        },
        {
          type: "doc",
          id: "api/functions/generateObjectArray",
          label: "generateObjectArray",
        },
        {
          type: "doc",
          id: "api/functions/generateShouldRespond",
          label: "generateShouldRespond",
        },
        {
          type: "doc",
          id: "api/functions/generateText",
          label: "generateText",
        },
        {
          type: "doc",
          id: "api/functions/generateTextArray",
          label: "generateTextArray",
        },
        {
          type: "doc",
          id: "api/functions/generateTrueOrFalse",
          label: "generateTrueOrFalse",
        },
        {
          type: "doc",
          id: "api/functions/getActorDetails",
          label: "getActorDetails",
        },
        { type: "doc", id: "api/functions/getEndpoint", label: "getEndpoint" },
        { type: "doc", id: "api/functions/getGoals", label: "getGoals" },
        { type: "doc", id: "api/functions/getModel", label: "getModel" },
        {
          type: "doc",
          id: "api/functions/getProviders",
          label: "getProviders",
        },
        {
          type: "doc",
          id: "api/functions/getRelationship",
          label: "getRelationship",
        },
        {
          type: "doc",
          id: "api/functions/getRelationships",
          label: "getRelationships",
        },
        {
          type: "doc",
          id: "api/functions/loadEnvConfig",
          label: "loadEnvConfig",
        },
        {
          type: "doc",
          id: "api/functions/retrieveCachedEmbedding",
          label: "retrieveCachedEmbedding",
        },
        { type: "doc", id: "api/functions/splitChunks", label: "splitChunks" },
        { type: "doc", id: "api/functions/trimTokens", label: "trimTokens" },
        { type: "doc", id: "api/functions/updateGoal", label: "updateGoal" },
      ],
    },
  ],
};
module.exports = typedocSidebar.items;
