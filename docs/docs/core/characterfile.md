---
sidebar_position: 4
---

# Character Files

Character files are JSON-formatted configurations that define an AI character's personality, knowledge, and behavior patterns. This guide explains how to create effective character files for use with LLM agents.

## Structure Overview

A character file contains several key sections that work together to define the character's personality and behavior:

```json
{
  "name": "character_name",
  "bio": [],
  "lore": [],
  "knowledge": [],
  "messageExamples": [],
  "postExamples": [],
  "topics": [],
  "style": {},
  "adjectives": []
}
```

## Core Components

### Bio Array

- Contains biographical information about the character
- Can be a single comprehensive biography or multiple shorter statements
- Multiple statements are randomized to create variety in responses
- Example:

```json
"bio": [
  "Mark Andreessen is an American entrepreneur and investor",
  "Co-founder of Netscape and Andreessen Horowitz",
  "Pioneer of the early web, created NCSA Mosaic"
]
```

### Lore Array

- Contains interesting facts and details about the character
- Helps define personality and unique traits
- Gets randomly sampled during conversations
- Example:

```json
"lore": [
  "Believes strongly in the power of software to transform industries",
  "Known for saying 'Software is eating the world'",
  "Early investor in Facebook, Twitter, and other tech giants"
]
```

### Knowledge Array

- Used for RAG (Retrieval Augmented Generation)
- Can contain chunks of text from articles, books, or other sources
- Helps ground the character's responses in factual information
- Can be generated from PDFs or other documents using provided tools

### Message Examples

- Sample conversations between users and the character
- Helps establish the character's conversational style
- Should cover various topics and scenarios
- Example:

```json
"messageExamples": [
  [
    {"user": "user1", "content": {"text": "What's your view on AI?"}},
    {"user": "character", "content": {"text": "AI is transforming every industry..."}}
  ]
]
```

### Style Object

Contains three key sections:

1. `all`: General style instructions for all interactions
2. `chat`: Specific instructions for chat interactions
3. `post`: Specific instructions for social media posts

Each section can contain multiple instructions that guide the character's communication style.

### Topics Array

- List of subjects the character is interested in or knowledgeable about
- Used to guide conversations and generate relevant content
- Helps maintain character consistency

### Adjectives Array

- Words that describe the character's traits and personality
- Used for generating responses with consistent tone
- Can be used in "Mad Libs" style content generation

## Best Practices

1. **Randomization for Variety**

   - Break bio and lore into smaller chunks
   - This creates more natural, varied responses
   - Prevents repetitive or predictable behavior

2. **Knowledge Management**

   - Use the provided tools to convert documents into knowledge:

   ```bash
   npx folder2knowledge <path/to/folder>
   npx knowledge2character <character-file> <knowledge-file>
   ```

3. **Style Instructions**

   - Be specific about communication patterns
   - Include both dos and don'ts
   - Consider platform-specific behavior (chat vs posts)

4. **Message Examples**
   - Include diverse scenarios
   - Show character-specific responses
   - Demonstrate typical interaction patterns

## Tools and Utilities

1. **Generate from Twitter**

```bash
npx tweets2character
```

2. **Convert Documents to Knowledge**

```bash
npx folder2knowledge <path/to/folder>
```

3. **Add Knowledge to Character**

```bash
npx knowledge2character <character-file> <knowledge-file>
```

## Context Length Considerations

- Modern LLMs support longer contexts (128k tokens)
- No strict limits on section lengths
- Focus on quality and relevance rather than size
- Consider randomization for large collections of information

## Validation

You can validate your character file against the schema using provided tools:

```bash
# Python
python examples/validate.py

# JavaScript
node examples/validate.mjs
```

## Tips for Quality

1. **Bio and Lore**

   - Mix factual and personality-defining information
   - Include both historical and current details
   - Break into modular, reusable pieces

2. **Style Instructions**

   - Be specific about tone and mannerisms
   - Include platform-specific guidance
   - Define clear boundaries and limitations

3. **Examples**

   - Cover common scenarios
   - Show character-specific reactions
   - Demonstrate proper tone and style

4. **Knowledge**
   - Focus on relevant information
   - Organize in digestible chunks
   - Update regularly to maintain relevance
