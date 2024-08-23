import { names, uniqueNamesGenerator } from "unique-names-generator";
import { Action, ActionExample } from "./types.ts";

import elaborate from "../actions/elaborate.ts";
import ignore from "../actions/ignore.ts";
import wait from "../actions/wait.ts";

export const defaultActions: Action[] = [elaborate, wait, ignore];

/**
 * Composes a set of example conversations based on provided actions and a specified count.
 * It randomly selects examples from the provided actions and formats them with generated names.
 * @param actionsData - An array of `Action` objects from which to draw examples.
 * @param count - The number of examples to generate.
 * @returns A string containing formatted examples of conversations.
 */
export const composeActionExamples = (actionsData: Action[], count: number) => {
  const actionExamples: ActionExample[][] = actionsData
    .map((action: Action) => action.examples)
    .flat();

  const randomMessageExamples: ActionExample[][] = [];

  // make sure count is not more than actionExamples
  const maxCount = actionExamples.length;
  if (count > maxCount) {
    count = maxCount;
  }

  while (
    randomMessageExamples.length < count &&
    randomMessageExamples.length < actionExamples.length
  ) {
    const randomIndex = Math.floor(Math.random() * actionExamples.length);
    const randomExample = actionExamples[randomIndex];
    if (!randomMessageExamples.includes(randomExample)) {
      randomMessageExamples.push(randomExample);
    }
  }

  const formattedExamples = randomMessageExamples.map((example) => {
    const exampleNames = Array.from({ length: 5 }, () =>
      uniqueNamesGenerator({ dictionaries: [names] }),
    );

    return `\n${example
      .map((message) => {
        let messageString = `${message.user}: ${message.content.content}${message.content.action ? ` (${message.content.action})` : ""}`;
        for (let i = 0; i < exampleNames.length; i++) {
          messageString = messageString.replaceAll(
            `{{user${i + 1}}}`,
            exampleNames[i],
          );
        }
        return messageString;
      })
      .join("\n")}`;
  });

  return formattedExamples.join("\n");
};

/**
 * Formats the provided actions into a string listing each action's name and description.
 * @param actions - An array of `Action` objects to format.
 * @returns A formatted string listing each action's name and description.
 */
export function getFormattedActions(actions: Action[]) {
  return actions
    .map((action) => {
      return `${action.name} - ${action.description}`;
    })
    .join("\n");
}

/**
 * Formats the names of the provided actions into a comma-separated string.
 * @param actions - An array of `Action` objects from which to extract names.
 * @returns A comma-separated string of action names.
 */
export function formatActionNames(actions: Action[]) {
  return actions.map((action: Action) => `${action.name}`).join(", ");
}

/**
 * Formats the provided actions into a detailed string listing each action's name and description, separated by commas and newlines.
 * @param actions - An array of `Action` objects to format.
 * @returns A detailed string of actions, including names and descriptions.
 */
export function formatActions(actions: Action[]) {
  return actions
    .map((action: Action) => `${action.name}: ${action.description}`)
    .join(",\n");
}

/**
 * Formats the conditions for each provided action into a string, listing each action's name and its associated condition, separated by commas and newlines.
 * @param actions - An array of `Action` objects from which to extract conditions.
 * @returns A string listing each action's name and its condition.
 */
export function formatActionConditions(actions: Action[]) {
  return actions
    .map((action: Action) => `'${action.name}: ${action.condition}'`)
    .join(",\n");
}
