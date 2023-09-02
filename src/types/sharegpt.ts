// Try matching this to axolotl's specifications
export interface ShareGPTChat {
    id: string,
    bot: ShareGPTBotInfo,
    roles: Array<string> | null,
    conversations: Array<ShareGPTConversation>
}

export interface ShareGPTBotInfo {
    name: string,
    categories: Array<string> | null,
    description: string
}

export interface ShareGPTConversation {
    from: string,
    value: string
}
