export interface PippaChat {
    submission_timestamp: number,
    categories: Array<string> | null,
    bot_id: string,
    bot_name: string,
    bot_greeting: string,
    bot_definitions: string,
    bot_description: string,
    conversation: Array<PippaMessage>
}

interface PippaMessage {
    message: string,
    is_human: boolean
}
