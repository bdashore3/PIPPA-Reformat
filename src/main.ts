import fs from 'fs'
import readline from 'readline'
import { PippaChat } from './types/pippa.js';
import { ShareGPTBotInfo, ShareGPTChat, ShareGPTConversation } from './types/sharegpt.js';

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

    if (fs.existsSync("data/pippa_sharegpt.jsonl")) {
        await fs.promises.unlink("data/pippa_sharegpt.jsonl")
    }

    const writeStream = fs.createWriteStream("data/pippa_sharegpt.jsonl", { flags: "a" })

    for await (const line of dataStream) {
        const pippaChat: PippaChat = JSON.parse(line)
        const shareGPTChat = getShareGPTChat(pippaChat)
        writeStream.write(JSON.stringify(shareGPTChat) + "\n")
    }

    writeStream.end()
}

function getShareGPTChat(pippaChat: PippaChat): ShareGPTChat {
    const conversations: ShareGPTConversation[] = []
    const system_prompt = `You are now in roleplay conversation mode. You should act according to this character sheet:\n${pippaChat.bot_description}\nYou must stay in-character at all times, and generate messages as if you were ${pippaChat.bot_name}.`
    conversations.push({
        from: 'system',
        value: system_prompt
    })

    pippaChat.conversation.forEach((e) => {
        const sender = e.is_human ? 'human' : 'gpt'
        if (conversations[conversations.length - 1] && conversations[conversations.length - 1]?.from === sender) {
            conversations[conversations.length - 1].value += `\n${e.message}`
        } else {
            conversations.push({
                from: sender,
                value: e.message
            })
        }
    })

    const info: ShareGPTBotInfo = {
        name: pippaChat.bot_name,
        categories: pippaChat.categories,
        description: pippaChat.bot_description
    }

    const chat: ShareGPTChat = {
        id: pippaChat.bot_id,
        bot: info,
        roles: ["USER", "CHARACTER"],
        conversations: conversations
    }

    return chat
}
