// Importing the filesystem module from Node.js to write files
import { writeFile } from 'fs/promises';
// Importing the array from './facts.mjs'
import facts from './facts.mjs';

const rewriteFacts = (factsArray) => {
    return factsArray.map(fact => {
        return `${fact.estimatedTimeOfDay}, ${fact.estimatedDaysFromStartOfBook === 0 ? "day of The Event" : `${fact.estimatedDaysFromStartOfBook} days after The Event` }: ${fact.fact}${fact.additionalContext ? ` ${fact.additionalContext}` : ''}`;
    });
};

const convertedFacts = rewriteFacts(facts);

const writeConvertedFacts = async (convertedFacts) => {
    try {
        // Converting the array to a string and formatting it for export as a module
        const content = `export default ${JSON.stringify(convertedFacts, null, 2)};`;
        await writeFile('./facts-converted.mjs', content);
        console.log('Converted facts saved successfully.');
    } catch (error) {
        console.error('Error saving the converted facts:', error);
    }
};

writeConvertedFacts(convertedFacts);
