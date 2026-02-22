import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { state, playerId } = req.body;

        if (!state || !playerId) {
            return res.status(400).json({ error: 'Missing state or playerId' });
        }

        const player = state.players[playerId];
        const cards = player.cards ? player.cards.join(', ') : 'unknown';
        const board = state.boardCards ? state.boardCards.join(', ') : 'none';

        const prompt = `You are an expert Texas Hold'em poker advisor. Look at this situation:
- Your Cards: ${cards}
- Board: ${board}
- Street: ${state.street}
- Pot: ${state.pot}
- Your Balance: ${player.balance}
- Highest Bet to Call: ${state.highestBet - (player.currentBet || 0)}

Give a single, concise 1-sentence recommendation on what action to take (Fold, Check, Call, or Raise), along with a brief reason. Do not exceed 15 words.`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 30,
            temperature: 0.7,
        });

        const recommendation = response.choices[0]?.message?.content || "Take your best guess.";

        return res.status(200).json({ recommendation });
    } catch (error) {
        console.error('OpenAI Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
