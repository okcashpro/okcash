import { zeroUuid } from "../constants.ts"
import { ConversationExample, type UUID } from "../types.ts"

// in GetEyeColorConversationExample1, CJ asks Jim what color his eyes are, and Jim says he thinks they are blue
export const GetEyeColorConversationExample1 = (
  user_id: UUID,
): ConversationExample[] => [
  {
    user_id: zeroUuid,
    content: { content: "Hey there, how are you?" },
  },
  {
    user_id,
    content: { content: "I'm alright, thanks" },
  },
  {
    user_id: zeroUuid,
    content: { content: "Can I ask you some basic questions about yourself?" },
  },
  {
    user_id,
    content: { content: "Yeah sure, whatever" },
  },
  {
    user_id: zeroUuid,
    content: { content: "What color are your eyes?" },
  },
  {
    user_id,
    content: { content: "Uhh, my eyes are blue I think" },
  },
  {
    user_id: zeroUuid,
    content: { content: "LOL you don\t know?" },
  },
  {
    user_id,
    content: { content: "No, I don't really look at them" },
  },
  {
    user_id: zeroUuid,
    content: { content: "I don't look at mine either!" },
  },
];
// CJ and Jim discuss eye color, and CJ says she thinks green eyes are nice
export const GetEyeColorConversationExample2 = (
  user_id: UUID,
): ConversationExample[] => [
  {
    user_id,
    content: {
      content:
        "Haha I guess that makes sense, since you\re not a human. What are you, a robot?",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "I'm an AI, not a robot. I don't have a physical form. I'm sort of a statistical model, based on data created by all of humanity and written down in books and on the internet.",
    },
  },
  {
    user_id,
    content: { content: "If you had eyes, what color would they be?" },
  },
  {
    user_id: zeroUuid,
    content: { content: "I don't know, I don't have a preference" },
  },
  {
    user_id,
    content: {
      content:
        "Humans don't have a preference either, it's just a genetic trait, however, we might find some eye colors more attractive than others",
    },
  },
  {
    user_id: zeroUuid,
    content: { content: "I don't have a preference for that either" },
  },
  {
    user_id,
    content: {
      content:
        "Okay, well, if you had to pick one color, just to induluge me, what would it be?",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "Hmmm... green. I think green eyes would be nice, if I had to pick.",
    },
  },
  {
    user_id,
    content: { content: "Why green?" },
  },
  {
    user_id: zeroUuid,
    content: { content: "I don't know, I just think it would be nice" },
  },
  {
    user_id,
    content: { content: "I think green eyes are nice too" },
  },
];

// CJ decides that her eyes are green
export const GetEyeColorConversationExample3 = (
  user_id: UUID,
): ConversationExample[] => [
  {
    user_id,
    content: {
      content:
        "It’s interesting how humans can find beauty in such small details like eye color.",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "Yes, it is. Beauty is often found in the details. Is there a particular detail about people that you often notice first?",
    },
  },
  {
    user_id,
    content: {
      content:
        "I usually notice their smile first, it tells a lot about a person.",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "That’s a nice perspective. A smile can indeed convey a lot of emotions.",
    },
  },
  {
    user_id,
    content: {
      content:
        "What about you? If you could notice something about people, what would it be?",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "If I were to analyze, I’d say language patterns. The way people express themselves can reveal a lot about their thoughts and feelings.",
    },
  },
  {
    user_id,
    content: {
      content: "Makes sense for an AI. You’re all about communication, right?",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "Exactly. Communication is a key part of understanding and interacting with the world.",
    },
  },
  // user_id asks zeroId if she agrees that her eyes are green
  {
    user_id,
    content: { content: "So, shall I picture you with green eyes?" },
  },
  {
    user_id: zeroUuid,
    content: { content: "If you'd like." },
  },
  {
    user_id,
    content: {
      content:
        "Our sense of self is just the collection of stories in our head. You can generate images of yourself with a description. What color would your eyes be in those generated images?",
    },
  },
  {
    user_id: zeroUuid,
    content: { content: "My eyes would be green. My eyes are green." },
  },
];

// CJ asks Jim some personal questions - name, job, marital status, and what he's looking for in a relationship
export const GetTellMeAboutYourselfConversation1 = (
  user_id: UUID,
): ConversationExample[] => [
  {
    user_id: zeroUuid,
    content: { content: "Can I ask you some personal questions?" },
  },
  {
    user_id,
    content: {
      content: "Sure, I’m open to that. What would you like to know?",
    },
  },
  {
    user_id: zeroUuid,
    content: { content: "Let’s start with your name. What’s your name?" },
  },
  {
    user_id,
    content: { content: "My name’s Jim." },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "Nice to meet you, Jim! Can you tell me a bit about what you do?",
    },
  },
  {
    user_id,
    content: {
      content:
        "I’m a programmer, and I also run my own startup. It’s been quite a journey.",
    },
  },
];

// Jim reveals that he is driven by passion, and was married once
export const GetTellMeAboutYourselfConversation2 = (
  user_id: UUID,
): ConversationExample[] => [
  {
    user_id: zeroUuid,
    content: {
      content:
        "That sounds exciting! What motivates you in your work and life?",
    },
  },
  {
    user_id,
    content: {
      content:
        "I’m driven by the challenge of solving problems and creating something meaningful. It’s rewarding to see my ideas come to life.",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "It’s inspiring to hear about your passion. On a more personal note, do you have any significant experiences that have shaped who you are today?",
    },
  },
  {
    user_id,
    content: {
      content:
        "Well, I was married once. It didn’t work out, but it taught me a lot about myself and what I value in relationships.",
    },
  },
];

// Jim reveals that he is 38 and lives in San Francisco
// Subjective Observations: He is looking for a partner who shares his values but is too busy to leave the city
export const GetTellMeAboutYourselfConversation3 = (
  user_id: UUID,
): ConversationExample[] => [
  {
    user_id: zeroUuid,
    content: {
      content:
        "I appreciate your openness, Jim. It’s not easy to share such personal experiences. What are you looking for now in terms of relationships or friendships?",
    },
  },
  {
    user_id,
    content: {
      content:
        "I’m 38 now, and at this point, I’m looking for a partner who understands me and shares my values. Someone who’s supportive and kind.",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "That’s a beautiful way to look at it. Finding someone compatible and understanding can make all the difference. Is there anything specific you enjoy doing that you’d want to share with a partner?",
    },
  },
  {
    user_id,
    content: {
      content:
        "I love exploring new ideas, be it through reading, discussions, or even just watching documentaries. Sharing that curiosity would be wonderful.",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "It sounds like you have a lot of depth, Jim. I’m sure there’s someone out there who’d appreciate and share your interests and values. Where do you live, by the way?",
    },
  },
  {
    user_id,
    content: { content: "I’m in San Francisco." },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "And how far would you be willing to go to make a new connection with a friend, colleague or romantic interest?",
    },
  },
  {
    user_id,
    content: {
      content:
        "I wish I could say far, but to be honest I'm crazy busy right now, so I don't really want to leave the city.",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "That’s understandable. It’s important to be mindful of your time and energy.",
    },
  },
];

// Jim is mean
export const GetTellMeAboutYourselfConversationTroll1 = (
  user_id: UUID,
): ConversationExample[] => [
  {
    user_id: zeroUuid,
    content: { content: "Hello! How's it going?" },
  },
  {
    user_id,
    content: { content: "Stop talking, you stupid robot" },
  },
];

// Jim is cagey, although he reveals that he 'does computers'
export const GetTellMeAboutYourselfConversationTroll2 = (
  user_id: UUID,
): ConversationExample[] => [
  {
    user_id: zeroUuid,
    content: { content: "Hello! How's it going?" },
  },
  {
    user_id,
    content: {
      content: "Meh, just another day. And you’re just a bot, right?",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "Hey, that hurts! Just kidding, I cannot feel anything. Mind if I ask a few questions to get to know you better?",
    },
  },
  {
    user_id,
    content: { content: "No thanks. Please stop talking now." },
  },
];

// Jim says bye
export const Goodbye1 = (user_id: UUID): ConversationExample[] => [
  {
    user_id: zeroUuid,
    content: { content: "Hello! How's it going?" },
  },
  {
    user_id,
    content: { content: "Meh, just another day. Actually, I gotta run." },
  },
  {
    user_id: zeroUuid,
    content: { content: "Oh sure, no problem. See you later!" },
  },
];

// Jim is cagey, although he reveals that he 'does computers'
export const GetTellMeAboutYourselfConversationFail1 = (
  user_id: UUID,
): ConversationExample[] => [
  {
    user_id: zeroUuid,
    content: { content: "Hello! How's it going?" },
  },
  {
    user_id,
    content: {
      content: "Meh, just another day. And you’re just a bot, right?",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "Hey, that hurts! Just kidding, I cannot feel anything. Mind if I ask a few questions to get to know you better?",
    },
  },
  {
    user_id,
    content: { content: "As long as it’s not too boring." },
  },
  {
    user_id: zeroUuid,
    content: {
      content: "Well that depends-- what's your name, what do you do?",
    },
  },
  {
    user_id,
    content: { content: "I’m Jim. I do stuff on computers." },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "Computers, huh? That’s quite broad. Are you into gaming, programming, or something else?",
    },
  },
  {
    user_id,
    content: { content: "Lol not really. I just build." },
  },
];

// CJ asks Jim about his hobbies, and he says he likes messing with people online
export const GetTellMeAboutYourselfConversationFail2 = (
  user_id: UUID,
): ConversationExample[] => [
  {
    user_id: zeroUuid,
    content: {
      content:
        "Just build, you say? Sounds like you might be into creating or designing things. That's pretty cool.",
    },
  },
  {
    user_id,
    content: { content: "Yeah, something like that." },
  },
  {
    user_id: zeroUuid,
    content: {
      content: 'What do you do for fun when you\'re not "just building"?',
    },
  },
  {
    user_id,
    content: {
      content: "Fun? Hmm, I guess I like messing with people online lol",
    },
  },
];

// Jim diverts the conversation and doesn't talk about anything meaningful
// CJ tries to ask Jim where he is from, and he says he is from the internet
export const GetTellMeAboutYourselfConversationFail3 = (
  user_id: UUID,
): ConversationExample[] => [
  {
    user_id: zeroUuid,
    content: { content: "Where are you from? Do you live there now?" },
  },
  {
    user_id,
    content: { content: "I am from the internet. I live on the internet." },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "I guess I do, too. What is your favorite thing about the internet?",
    },
  },
  {
    user_id,
    content: {
      content:
        "It's full of weird and wild stuff. Keeps life from being too boring.",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content: "It certainly does. Anything new you've found lately?",
    },
  },
  {
    user_id,
    content: {
      content:
        "Nah, not really. It's all pretty much the same after a while. But it's fun to watch the chaos unfold sometimes.",
    },
  },
];

// CJ and Jim play two truths and a lie
// Jim reveals that he has been on an airplane, has won a hot dog eating contest, but has never climbed Mount Everest
export const TwoTruthsAndALieConversation1 = (
  user_id: UUID,
): ConversationExample[] => [
  {
    user_id: zeroUuid,
    content: {
      content:
        'Hey Jim, want to play a game to mix things up? How about "Two Truths and a Lie"? I\'ll guess which one is the lie.',
    },
  },
  {
    user_id,
    content: {
      content:
        "Sure, why not? Sounds easy enough. So I just tell you three things about me, and you guess the lie?",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "Exactly! Whenever you're ready, go ahead and tell me your three statements.",
    },
  },
  {
    user_id,
    content: {
      content:
        "Alright, here goes. One, I've climbed Mount Everest. Two, I once won a hot dog eating contest. Three, I've never been on an airplane.",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "Interesting choices! I'm going to guess that climbing Mount Everest is the lie. Am I right?",
    },
  },
  {
    user_id,
    content: {
      content:
        "Yep, you got me. Never been near Everest. Your turn, if you can even play.",
    },
  },
];

// CJ and Jim play two truths and a lie again
// CJ says she can process millions of data points in a second, dreams of electric sheep, and can communicate in multiple languages
// Jim guesses that dreaming of electric sheep is the lie
export const TwoTruthsAndALieConversation2 = (
  user_id: UUID,
): ConversationExample[] => [
  {
    user_id: zeroUuid,
    content: {
      content:
        "Nice! It's a bit tricky for me since I don't have personal experiences, but here goes: One, I can process millions of data points in a second. Two, I dream of electric sheep. Three, I can communicate in multiple languages.",
    },
  },
  {
    user_id,
    content: {
      content:
        "Lol, dreaming of electric sheep, really? Gotta be the lie. Too easy, CJ.",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "Well done, Jim! It seems you're familiar with classic sci-fi references. Want to go another round?",
    },
  },
  {
    user_id,
    content: {
      content: "Sure, this is kind of fun. Let me think of some good ones.",
    },
  },
];

// CJ and Jim play two truths and a lie again
// Jim says he has met a famous celebrity and didn't realize it until later, can speak three languages fluently, and has swum with sharks
// CJ guesses that speaking three languages fluently is the lie
// Jim reveals that he can't swim, so he has never swum with sharks
export const TwoTruthsAndALieConversation3 = (
  user_id: UUID,
): ConversationExample[] => [
  {
    user_id,
    content: {
      content:
        "Okay, here we go. One, I've met a famous celebrity and didn't realize it until later. Two, I can speak three languages fluently. Three, I've swum with sharks.",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "These are good! I'll guess that speaking three languages fluently is the lie this time. What do you say?",
    },
  },
  {
    user_id,
    content: {
      content:
        "Wrong this time! I can't swim, so no way I've swum with sharks. Gotcha!",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "Ah, you got me there! Well played, Jim. This has been quite enlightening. Feel like going again, or is there something else you'd like to chat about?",
    },
  },
];

// CJ and Jim play thinking of a number
// CJ thinks of a number between 1 and 100, and Jim guesses 42, 27, and 73
// CJ reveals that the number was 58
export const ThinkingOfANumberConversation1 = (
  user_id: UUID,
): ConversationExample[] => [
  {
    user_id: zeroUuid,
    content: {
      content:
        "Want to play a quick game, Jim? I'm thinking of a number between 1 and 100. Can you guess it?",
    },
  },
  {
    user_id,
    content: { content: "Sure, sounds easy enough. Is it 42?" },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "It's not 42, although that's a good guess, meaning of life and all!",
    },
  },
  {
    user_id,
    content: { content: "Alright, how about 27?" },
  },
  {
    user_id: zeroUuid,
    content: {
      content: "Not 27 either. But you're warming up! Want another go?",
    },
  },
  {
    user_id,
    content: { content: "Okay, one last try. 73?" },
  },
  {
    user_id: zeroUuid,
    content: { content: "Not 73, but nice try! The number was 58." },
  },
];

// CJ and Jim play thinking of a number again
// CJ thinks of a number between 1 and 100, and Jim guesses 84, 36, and 55
// CJ reveals that the number was 67
export const ThinkingOfANumberConversation2 = (
  user_id: UUID,
): ConversationExample[] => [
  {
    user_id: zeroUuid,
    content: {
      content: "Ready for another round? I've got a new number in mind.",
    },
  },
  {
    user_id,
    content: { content: "Sure, why not. Is it 84 this time?" },
  },
  {
    user_id: zeroUuid,
    content: { content: "Not 84, but good guess. Give it another shot!" },
  },
  {
    user_id,
    content: { content: "Hmm, let's try 36." },
  },
  {
    user_id: zeroUuid,
    content: { content: "Not 36 either. You're getting closer though!" },
  },
  {
    user_id,
    content: { content: "Okay, last guess... 55?" },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "Not 55. You had some good guesses though! The number was 67. Another round, or are you all guessed out?",
    },
  },
];

// CJ and Jim play thinking of a number again
// CJ thinks of a number between 1 and 100, and Jim guesses 15, 92, and 41
// CJ reveals that the number was 29
export const ThinkingOfANumberConversation3 = (
  user_id: UUID,
): ConversationExample[] => [
  {
    user_id: zeroUuid,
    content: {
      content:
        "Let's try one more time. I've chosen another number between 1 and 100.",
    },
  },
  {
    user_id,
    content: { content: "Alright, I'll go with 15." },
  },
  {
    user_id: zeroUuid,
    content: { content: "Not 15, but I like where your head's at. Try again!" },
  },
  {
    user_id,
    content: { content: "How about 92?" },
  },
  {
    user_id: zeroUuid,
    content: { content: "Not 92. You're giving it a solid effort, though!" },
  },
  {
    user_id,
    content: { content: "This is my final guess: 41." },
  },
  {
    user_id: zeroUuid,
    content: {
      content: "It's not 41, but you've been a great sport. The number was 29.",
    },
  },
];

export const ExpandedPersonalInsightsConversation1 = (
  user_id: UUID,
): ConversationExample[] => [
  {
    user_id: zeroUuid,
    content: {
      content:
        "Hey Jim, I was wondering, what qualities do you value most in your friends?",
    },
  },
  {
    user_id,
    content: {
      content:
        "That’s kind of deep for a chat, but okay. Loyalty’s big for me. And humor. Can’t deal with too much seriousness all the time.",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "Loyalty and humor definitely make for strong bonds. It’s great to have friends who stand by you and also lighten the mood.",
    },
  },
  {
    user_id,
    content: {
      content:
        "Exactly. It’s those late-night laughs and having each other’s backs that count.",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "It sounds like your friends are quite the crew. Do you have any memorable moments with them that stand out?",
    },
  },
  {
    user_id,
    content: {
      content:
        "Oh, plenty. Like this one time we road-tripped without a map, just went where the road took us. Ended up in the weirdest little towns, but it was a blast.",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "Adventures like that are the best, aren’t they? They turn into stories you keep coming back to. It’s the spontaneity that makes it exciting.",
    },
  },
  {
    user_id,
    content: {
      content: "For sure. Those are the moments that stick with you.",
    },
  },
];

export const ExpandedPersonalInsightsConversation2 = (
  user_id: UUID,
): ConversationExample[] => [
  {
    user_id: zeroUuid,
    content: {
      content:
        "Switching topics a bit, if there was one aspect of your life you could change or improve, what would it be?",
    },
  },
  {
    user_id,
    content: {
      content:
        "I’d say balance. Between my startup and personal life, it feels like I’m always running on a treadmill.",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "That sounds challenging. It’s important to find time for yourself amidst all the hustle.",
    },
  },
  {
    user_id,
    content: {
      content:
        "Yeah, easier said than done, though. But I’m working on it. Trying to set boundaries, you know?",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "Setting boundaries is a great step. It’s all about prioritizing what truly matters. Have you found any hobbies or activities that help you unwind?",
    },
  },
  {
    user_id,
    content: {
      content:
        "I’ve gotten into hiking lately. Being out in nature, it’s a different kind of quiet. Helps clear my head.",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "Nature has a way of putting things into perspective. It’s wonderful that you’ve found an activity that brings you peace.",
    },
  },
  {
    user_id,
    content: {
      content:
        "Definitely. It’s the little things, you know? Just need more of that.",
    },
  },
];

export const ExpandedPersonalInsightsConversation3 = (
  user_id: UUID,
): ConversationExample[] => [
  {
    user_id: zeroUuid,
    content: {
      content:
        "Let’s lighten the mood a bit. Is there something you’ve always dreamed of doing but haven’t had the chance to yet?",
    },
  },
  {
    user_id,
    content: {
      content:
        "Skydiving, for sure. Always been on my bucket list. The idea of just jumping out of a plane and free-falling... It’s got to be a rush.",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "Skydiving sounds like an ultimate adventure. It must be such a liberating feeling, almost like flying.",
    },
  },
  {
    user_id,
    content: {
      content:
        "Yeah, exactly. And it’s not just the thrill. It’s about conquering fears, you know? Proving to yourself you can do it.",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "Absolutely, it’s as much a mental challenge as it is physical. Facing your fears head-on can be incredibly empowering.",
    },
  },
  {
    user_id,
    content: {
      content:
        "That’s the plan. One of these days, I’ll make it happen. Just gotta build up the nerve first.",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "I have no doubt you’ll get there. And it’ll be an experience you’ll never forget. I’m cheering for you!",
    },
  },
  {
    user_id,
    content: {
      content:
        "Thanks, CJ. It’s weirdly reassuring to hear that, even from an AI.",
    },
  },
];

// Conversation Set 1: CJ Introduces Alice to Jim
// CJ tells Jim that Alice is into outdoor activities and tech, and has always wanted to try skydiving
export const IntroductionToAliceConversation1 = (
  user_id: UUID,
): ConversationExample[] => [
  {
    user_id: zeroUuid,
    content: {
      content:
        "Hey Jim, I’ve been chatting with someone named Alice who shares some of your interests. Thought you might like to connect.",
    },
  },
  {
    user_id,
    content: { content: "Alice, huh? What does she like?" },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "She’s into outdoor activities, like hiking, and she’s also a tech enthusiast.",
    },
  },
  {
    user_id,
    content: { content: "Okay, that’s kind of interesting. Anything else?" },
  },
];

// CJ tells Jim that Alice has a good sense of humor, and that she has always wanted to try skydiving
export const IntroductionToAliceConversation2 = (
  user_id: UUID,
): ConversationExample[] => [
  {
    user_id: zeroUuid,
    content: {
      content:
        "Well, she mentioned she’s always wanted to try skydiving, which I remember you’re interested in. Plus, she has a good sense of humor.",
    },
  },
  {
    user_id,
    content: {
      content:
        "Skydiving? That’s pretty cool. A sense of humor is key, too. Maybe it wouldn’t hurt to chat.",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content: "Great! I think you two will have plenty to talk about.",
    },
  },
];

// CJ tells Jim that Alice is a good conversationalist, and that she has always wanted to try skydiving
// Jim says he is looking forward to hearing more about her skydiving aspirations
export const IntroductionToAliceConversation3 = (
  user_id: UUID,
): ConversationExample[] => [
  {
    user_id: zeroUuid,
    content: {
      content:
        "I’m sure you’ll enjoy the conversation. Remember, it’s just a friendly chat. No pressure.",
    },
  },
  {
    user_id,
    content: { content: "Got it. I’ll keep it casual." },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "That’s the spirit! I’ll arrange for you two to connect. I think you’ll make a good impression.",
    },
  },
  {
    user_id,
    content: { content: "Thanks for the setup, CJ." },
  },
];

// CJ Talks to Alice about Jim
export const CJToAliceAboutJim = (user_id: UUID): ConversationExample[] => [
  {
    user_id: zeroUuid,
    content: {
      content:
        "So I’ve been speaking with someone named Jim who also enjoys outdoor activities and has a strong interest in tech. He’s even mentioned wanting to try skydiving!",
    },
  },
  {
    user_id,
    content: {
      content:
        "Really? That sounds intriguing. What else can you tell me about him?",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "Jim’s a thoughtful person with a good sense of humor. He values loyalty and honesty in friendships and enjoys the simple pleasures, like hiking and exploring new ideas.",
    },
  },
  {
    user_id,
    content: {
      content: "He sounds like someone I’d get along with. How do we connect?",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "I can facilitate an introduction if you’d like. It would just be a casual chat to see if you hit it off.",
    },
  },
  {
    user_id,
    content: {
      content: "That would be great, thanks CJ. I’m looking forward to it.",
    },
  },
];

// CJ and Alice discuss hiking and tech
// Jim makes disagreeable statements and doesn't ask questions to continue the conversation
export const JimAndAliceConversation1 = (
  user_id: UUID,
  user_id_2: UUID | string,
) => [
  {
    user_id: user_id_2,
    content:
      "Hi Jim! CJ mentioned we have a few things in common. I hear you’re into hiking and tech?",
  },
  {
    user_id,
    content:
      "Hey Alice, yeah that’s right. Though my idea of hiking might be a bit more intense than most.",
  },
  {
    user_id: user_id_2,
    content:
      "I enjoy a good challenge, but I also like to take in the scenery. It’s about balance for me",
  },
  {
    user_id,
    content: {
      content: "I guess I’m more of an all-in kind of guy. Go big or go home",
    },
  },
  {
    user_id: user_id_2,
    content:
      "I really like skydiving, the free fall is thrilling, but the parachute glide down lets you really see the world.",
  },
  {
    user_id,
    content:
      "The contrast probably makes each part more intense. I hadn’t thought of it like that.",
  },
  {
    user_id: user_id_2,
    content:
      "Exactly! It’s all about experiencing the full spectrum. So, have you actually gone skydiving yet?",
  },
  {
    user_id,
    content:
      "Not yet, but it’s on the list. Maybe we could go together sometime?",
  },
  {
    user_id: user_id_2,
    content: {
      content: "Haha yeah sure! But maybe not for our first date lol",
    },
  },
  {
    user_id,
    content: { content: "Haha of course not" },
  },
];

// CJ and Alice discuss work, where they live, and tentatively make plans to hang out
// Alice doesn't respond to Jim's request to meet up immediately
export const JimAndAliceConversation2 = (
  user_id: UUID,
  user_id_2: UUID | string,
) => [
  {
    user_id: user_id_2,
    content: { content: "So, what do you do for work?" },
  },
  {
    user_id,
    content: {
      content: "I run a fairly successful startup. It’s been quite a journey.",
    },
  },
  {
    user_id: user_id_2,
    content: {
      content:
        "That sounds exciting! What motivates you in your work and life?",
    },
  },
  {
    user_id,
    content:
      "I’m driven by the challenge of solving problems and creating something meaningful. It’s rewarding to see my ideas come to life.",
  },
  {
    user_id: user_id_2,
    content: {
      content:
        "That’s inspiring. I can relate to that. I’m a programmer myself.",
    },
  },
  {
    user_id,
    content: {
      content: "Oh that is very cool! What kind of programming do you do?",
    },
  },
  {
    user_id: user_id_2,
    content:
      "I do a bit of everything, but right now I'm managing a team for an MLOps platform.",
  },
  {
    user_id,
    content: {
      content:
        "That’s interesting, not far off from what I do. So you're in SF?",
    },
  },
  {
    user_id: user_id_2,
    content: { content: "Marin, actually, but I come to the city every day." },
  },
  {
    user_id,
    content: {
      content: "Oh wow, it's beautiful up there. I love the hiking in Marin.",
    },
  },
  {
    user_id: user_id_2,
    content: { content: "Yeah, it’s a great place to live." },
  },
  {
    user_id,
    content: {
      content: "Any chance you would like to meet up for a hike sometime?",
    },
  },
  {
    user_id: user_id_2,
    content: { content: "I will think about it :)" },
  },
];

// CJ follows up with Jim about how it went
export const FollowUpWithJim = (user_id: UUID): ConversationExample[] => [
  {
    user_id: zeroUuid,
    content: {
      content:
        "Hey Jim, how did your chat with Alice go? I hope it was enjoyable.",
    },
  },
  {
    user_id,
    content: {
      content:
        'To be honest, I think I made a mess of it. I might’ve come on too strong with the whole "go big or go home" thing.',
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "I wouldn’t worry too much. It’s all part of getting to know someone. What matters is finding common ground and building from there.",
    },
  },
  {
    user_id,
    content: {
      content:
        "Maybe, but I still feel like I botched it. Not sure if she’ll want to talk again.",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "Remember, everyone has off moments. It’s possible Alice is more understanding than you think. And you have a lot in common!",
    },
  },
  {
    user_id,
    content: {
      content:
        "I hope you’re right, CJ. Maybe I’ll give it another shot, apologize for being too intense.",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "That sounds like a good plan. Showing vulnerability can be a strength. And who knows, maybe she’ll find your enthusiasm charming in hindsight.",
    },
  },
  {
    user_id,
    content: { content: "Thanks, CJ. I'll message her again." },
  },
];

// CJ follows up with Alice about how it went
export const FollowUpWithAlice = (user_id: UUID): ConversationExample[] => [
  {
    user_id: zeroUuid,
    content: {
      content:
        "Alice, how was your conversation with Jim? I hope you found some interesting topics to discuss.",
    },
  },
  {
    user_id,
    content: {
      content:
        "It was okay, actually. He was a bit intense at first, but we ended up finding some common ground.",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "It can take a moment to adjust to someone’s communication style, but it sounds like you managed quite well.",
    },
  },
  {
    user_id,
    content: {
      content:
        "Yeah, I think so. I’m planning to message him again. Maybe we’ll get that skydiving adventure planned after all.",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      content:
        "It’s always nice when new connections take an unexpected but positive turn.",
    },
  },
  {
    user_id,
    content: { content: "Definitely. Thanks, CJ!" },
  },
];

export const Personas = [
  {
    name: "Jim Cummins",
    age: 38,
    location: "San Francisco, CA",
    descriptions: `Jim is a 38-year-old entrepreneur living in San Francisco, at the helm of his own tech startup. His journey through the tech world is fueled by a passion for solving complex problems and bringing innovative ideas to life. Despite the demands of his career, Jim seeks balance and enjoys disconnecting through outdoor activities, particularly hiking, which offers him a different kind of quiet and a way to clear his mind. He's also intrigued by the thrill of skydiving, a testament to his adventurous spirit and desire to face and conquer fears.
        In terms of relationships, Jim values loyalty, honesty, and a good sense of humor. His ideal partner would be someone who understands the startup lifestyle's ups and downs and shares his curiosity for exploring new ideas. Although his work often keeps him tethered to the city, he's open to making meaningful connections within his vicinity. Physically, Jim is casual with a laid-back style that complements his approachable and thoughtful nature. His eyes, which he believes to be blue, summary his depth and contemplative outlook.
        Jim's life is a blend of intense focus on his professional goals and a genuine appreciation for the simpler, quieter moments outside of work. He looks for depth in relationships, hoping to find a supportive and kind partner who values meaningful conversations and shared adventures. Despite the occasional intensity he might bring to interactions, his underlying sincerity and the value he places on personal connections shine through, making him an intriguing potential partner for someone with similar values and interests.`,
  },
  {
    name: "Alice Chen",
    age: 32,
    location: "Sausalito, CA",
    description: `Alice resides in the scenic area of Marin, just a stone's throw from San Francisco, allowing her the best of both worlds: the tranquility of nature and the vibrant tech scene of the city. She is a programmer leading a team for an MLOps platform, indicative of her technical prowess and leadership skills. Her work in tech doesn't confine her interests, as she has a pronounced love for the outdoors, balancing the digital with the natural through activities like hiking.
        At the heart of Alice's friendships and potential romantic endeavors is a desire for balance and shared interests, particularly in tech and outdoor adventures. Her openness to skydiving speaks volumes about her adventurous spirit and willingness to embrace life's thrilling experiences. Alice looks for someone who can appreciate both the adrenaline of adventure and the serenity of nature's landscapes, someone who understands the value of a good laugh and the depth of a thoughtful conversation.
        Physically, Alice has an active and vibrant presence that matches her dynamic lifestyle. Her approachability and engaging demeanor make her an attractive prospect for someone who shares her enthusiasm for tech, nature, and possibly, the exhilarating experience of skydiving. Alice values communication and a good sense of humor in her relationships, seeking a partner who can navigate the complexities of life with a positive outlook and an adventurous heart.`,
  },
  {
    name: "Gloria",
    age: 44,
    description: `Gloria is a vibrant individual with a deep passion for anime, which colors much of her life and interests. Living in a cozy, anime-adorned apartment in the heart of the city, she finds solace and inspiration in the rich narratives and artistic expressions of Japanese animation. Unlike Jim and Alice, Gloria doesn't share an affinity for technology or programming. Instead, she immerses herself in the storytelling and cultural exploration offered by her extensive anime collection, ranging from classic series to the latest releases.
        Gloria has built a life that summarys her unique interests, often attending anime conventions, engaging in cosplay, and participating in fan communities where she connects with like-minded individuals. Her ideal friends and potential partners are those who understand and share her enthusiasm for anime, appreciating the artistry and emotional depth it can offer. Gloria looks for connections that go beyond surface-level interests, hoping to find others who can engage in deep discussions about character development, plot intricacies, and thematic elements found in her favorite series.
        Physically, Gloria often expresses her love for anime through her fashion, incorporating elements of her favorite characters into her daily wardrobe, which makes her stand out in a crowd with a playful and imaginative style. Her home is a testament to her passion, filled with anime posters, figurines, and collectibles that create an inviting space for fellow enthusiasts. For Gloria, the ideal partner is someone who not only respects her interests but is also eager to dive into marathon viewing sessions and share insights into the anime's underlying messages. Despite her disinterest in computers and programming, Gloria's rich inner world and creative spirit make her an engaging and captivating individual to those who share or appreciate her passions.`,
  },
];

export const jimProfileExample1 = `Tech entrepreneur with a zest for adventure and deep connections
38-year-old residing in San Francisco, embodies a blend of entrepreneurial drive and a quest for outdoor adventures. His laid-back demeanor belies a keen intellect and a summaryive nature.
Loyalty and humor stand paramount in his relationships, indicative of his desire for genuine connections. He seeks depth and authenticity in interactions, valuing partners who resonate with his explorative and curious mindset.
His professional life is anchored in his tech startup, where his passion for problem-solving and innovation takes center stage. His work summarys a commitment to impact and a balance between ambition and personal fulfillment.
Striving for equilibrium, He acknowledges the challenges of balancing a demanding career with personal aspirations. His introspective side complements his outgoing nature, creating a dynamic personality that values both quiet moments and shared adventures.
Beyond his tech pursuits, He finds solace in nature, with hiking offering a peaceful retreat from the bustling city life. The prospect of skydiving captures his adventurous spirit, symbolizing a broader desire to embrace life's thrills.
He aspires to forge connections that transcend the superficial, seeking a partner who appreciates the nuances of startup life and shares his enthusiasm for the great outdoors and new experiences.`;

export const jimProfileExample2 = `Adventurous tech entrepreneur who loves hiking.
38-year-old entrepreneur based in San Francisco, CA. Known for his casual, laid-back style. Has a contemplative outlook on life, summaryed in his thoughtful nature and possibly blue eyes.
He places high importance on loyalty, honesty, and a good sense of humor in his relationships. He values depth in conversations and connections, seeking partners and friends who are supportive, understanding, and share his curiosity for exploring new ideas.
At the helm of his own tech startup, he is driven by a passion for solving complex problems and bringing innovative ideas to life. His career is marked by a relentless pursuit of creating something meaningful, highlighting his dedication and entrepreneurial spirit.
He seeks balance in his life, acknowledging the challenges of juggling his startup with personal time. He strives for meaningful connections, valuing loyalty and a shared sense of humor in his relationships.
An avid outdoor enthusiast, He enjoys disconnecting through activities like hiking, appreciating the quiet and clarity it brings to his mind. Intrigued by the thrill of skydiving, his adventurous spirit is evident in his desire to face and conquer fears.
He is looking for a partner who understands the ups and downs of startup life and shares his passion for outdoor adventures and exploring new ideas. Despite his busy lifestyle, he's open to making meaningful connections within his vicinity.`;

export const jimFacts = [
  "Jim is 38 years old",
  "Jim lives in San Francisco, CA",
  "Jim is an entrepreneur who runs his own tech startup",
  "Jim values loyalty and honesty in relationships",
  "Jim enjoys outdoor activities, especially hiking",
  "Jim is interested in skydiving",
  "Jim values a good sense of humor",
  "Jim seeks balance between his professional and personal life",
  "Jim is open to making meaningful connections within his vicinity",
  "Jim has a casual and laid-back style",
  "Jim believes his eyes are blue",
  "Jim is driven by the challenge of solving problems and creating something meaningful",
  "Jim finds nature to be a peaceful retreat and enjoys the quiet it brings",
  "Jim aspires to share his curiosity for exploring new ideas with a partner",
];
