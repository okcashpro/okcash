import { names, uniqueNamesGenerator } from "unique-names-generator";
import { Action, ActionExample } from "./types.ts";

/**
 * Composes a set of example conversations based on provided actions and a specified count.
 * It randomly selects examples from the provided actions and formats them with generated names.
 * @param actionsData - An array of `Action` objects from which to draw examples.
 * @param count - The number of examples to generate.
 * @returns A string containing formatted examples of conversations.
 */
export const composeActionExamples = (actionsData: Action[], count: number) => {
    const actionExamples: ActionExample[][] = actionsData
        .sort(() => 0.5 - Math.random())
        .map((action: Action) =>
            action.examples.sort(() => 0.5 - Math.random()).slice(0, 5)
        )
        .flat()
        .slice(0, count);

    const formattedExamples = actionExamples.map((example) => {
        const exampleNames = Array.from({ length: 5 }, () =>
            uniqueNamesGenerator({ dictionaries: [names] })
        );

        return `\n${example
            .map((message) => {
                let messageString = `${message.user}: ${message.content.text}${message.content.action ? ` (${message.content.action})` : ""}`;
                for (let i = 0; i < exampleNames.length; i++) {
                    messageString = messageString.replaceAll(
                        `{{user${i + 1}}}`,
                        exampleNames[i]
                    );
                }
                return messageString;
            })
            .join("\n")}`;
    });

    return formattedExamples.join("\n");
};

/**
 * Formats the names of the provided actions into a comma-separated string.
 * @param actions - An array of `Action` objects from which to extract names.
 * @returns A comma-separated string of action names.
 */
export function formatActionNames(actions: Action[]) {
    return actions
        .sort(() => 0.5 - Math.random())
        .map((action: Action) => `${action.name}`)
        .join(", ");
}

/**
 * Formats the provided actions into a detailed string listing each action's name and description, separated by commas and newlines.
 * @param actions - An array of `Action` objects to format.
 * @returns A detailed string of actions, including names and descriptions.
 */
export function formatActions(actions: Action[]) {
    return actions
        .sort(() => 0.5 - Math.random())
        .map((action: Action) => `${action.name}: ${action.description}`)
        .join(",\n");
}
