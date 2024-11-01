export const commands = [
  // {
  //     name: "setname",
  //     description: "Change the agent's name in the database",
  //     options: [
  //         {
  //             name: "name",
  //             description: "The new name for the agent",
  //             type: 3,
  //             required: true,
  //         },
  //     ],
  // },
  // {
  //     name: "setbio",
  //     description: "Change the agent's bio in the database",
  //     options: [
  //         {
  //             name: "bio",
  //             description: "The new bio for the agent",
  //             type: 3,
  //             required: true,
  //         },
  //     ],
  // },
  {
    name: "joinchannel",
    description: "Join the voice channel the user is in",
    options: [
      {
        name: "channel",
        description: "The voice channel to join",
        type: 7,
        required: true,
      },
    ],
  },
  {
    name: "leavechannel",
    description: "Leave the voice channel the user is in",
  },
];
