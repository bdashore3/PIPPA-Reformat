import fs from 'fs'
import readline from 'readline' 
import { PippaChat } from './types/pippa.js';
import { ShareGPTBotInfo, ShareGPTChat, ShareGPTConversation } from './types/sharegpt.js';
import { SystemPromptChunk } from './types/extra.js';

// Remove the async call if you don't require async code
try {
    await main();
} catch (err) {
    console.log(`Uncaught exception: \n\n${err}`);
}

async function main() {
    const dataStream = readline.createInterface({
        input: fs.createReadStream('data/pippa_deduped.jsonl'),
        crlfDelay: Infinity,
    })

    if (fs.existsSync("data/pippa_sharegpt_trimmed.jsonl")) {
        await fs.promises.unlink("data/pippa_sharegpt_trimmed.jsonl")
    }

    const writeStream = fs.createWriteStream("data/pippa_sharegpt_trimmed.jsonl", { flags: "a" })

    // All system prompt chunks organized by order in the prompt itself
    const systemPromptChunks = [
        {
            selectedIndex: -1,
            choices: ["roleplay conversation", "RP", "roleplay chat", "roleplaying"]
        },
        {
            selectedIndex: -1,
            choices: ["following", "provided", "given"]
        },
        {
            selectedIndex: -1,
            choices: ["sheet", "description", "persona", "definition", "summary"]
        },
        {
            selectedIndex: -1,
            choices: ["messages", "replies", "responses"]
        }
    ]

    for await (const line of dataStream) {
        const pippaChat: PippaChat = JSON.parse(line)
        const systemPrompt = buildSystemPrompt(pippaChat, systemPromptChunks)
        const shareGPTChat = getShareGPTChat(pippaChat, systemPrompt, ["USER", "CHARACTER"])
        if (shareGPTChat) {
            writeStream.write(JSON.stringify(shareGPTChat) + "\n")
        }
    }

    writeStream.end()
}

// Builds the system prompt using randomized phrases
function buildSystemPrompt(pippaChat: PippaChat, chunks: SystemPromptChunk[]): string {
    // Seriously fix this. It looks really bad
    const itemizedPrompt = [
        "You are now in ",
        getPromptString(chunks[0]),
        " mode. ",
        "You must act according to the ",
        getPromptString(chunks[1]),
        " character ",
        getPromptString(chunks[2]),
        ":\n",
        pippaChat.bot_description,
        "\nYou must stay in-character at all times, and generate ",
        getPromptString(chunks[3]),
        " as if you were ",
        pippaChat.bot_name,
        "."
    ]

    return itemizedPrompt.join("")
}

function getPromptString(chunk: SystemPromptChunk): string {
    while(true) {
        const newIndex = Math.floor(Math.random() * chunk.choices.length)
        if (newIndex !== chunk.selectedIndex) {
            chunk.selectedIndex = newIndex
            break
        }
    }

    return chunk.choices[chunk.selectedIndex]
}

function cleanNewlines(input: string): string {
    return input.replaceAll(/[\n]+/g, '\n')
}

function getShareGPTChat(pippaChat: PippaChat, systemPrompt?: string, roles?: string[]): ShareGPTChat | undefined {
    // If there's no bot description present, skip it
    if (!pippaChat.bot_description) {
        return undefined
    }

    const conversations: ShareGPTConversation[] = []
    const defaultSystemPrompt = `You are now in roleplay conversation mode. You should act according to this character sheet:\n${pippaChat.bot_description}\nYou must stay in-character at all times, and generate messages as if you were ${pippaChat.bot_name}.`

    conversations.push({
        from: 'system',
        value: cleanNewlines(systemPrompt ?? defaultSystemPrompt)
    })

    pippaChat.conversation.forEach((e) => {
        // Remove all instances of more than one newline.
        const cleanedMessage = cleanNewlines(e.message)

        // Is the message empty? Remove it and continue. The turn system will pick up the slack.
        if (cleanedMessage.trim().length === 0) {
            return;
        }

        // Enforce human/GPT turns
        // If a GPT turn is given twice, add a newline to be safe. This isn't ideal, but works.
        const sender = e.is_human ? 'human' : 'gpt'
        if (conversations[conversations.length - 1] && conversations[conversations.length - 1]?.from === sender) {
            conversations[conversations.length - 1].value += `\n${cleanedMessage}`
        } else {
            conversations.push({
                from: sender,
                value: cleanedMessage
            })
        }
    })

    const info: ShareGPTBotInfo = {
        name: pippaChat.bot_name,
        categories: pippaChat.categories,
        description: cleanNewlines(pippaChat.bot_description)
    }

    const chat: ShareGPTChat = {
        id: pippaChat.bot_id,
        bot: info,
        roles: roles,
        conversations: conversations
    }

    return chat
}
