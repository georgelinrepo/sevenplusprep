// functions/src/generateSentences.ts
import Anthropic from '@anthropic-ai/sdk'
import { defineSecret } from 'firebase-functions/params'
import { onCall, HttpsError } from 'firebase-functions/v2/https'

export const anthropicKey = defineSecret('ANTHROPIC_API_KEY')

const LEVEL_PROMPTS: Record<string, string> = {
  Beginner: `Generate 3 simple dictation sentences for a 6-7 year old child practising for UK 7+ entrance exams.
Each sentence should:
- Be 12-16 words long
- Use simple, everyday vocabulary a 6-year-old would know
- Include at least one capital letter and a full stop
- Include ONE challenge: either a common homophone (to/too/two, see/sea) OR a simple contraction (it's, don't)
- Sound like a natural sentence a child might encounter`,

  Developing: `Generate 3 dictation sentences for a 6-7 year old practising for UK 7+ entrance exams at developing level.
Each sentence should:
- Be 15-20 words long
- Include slightly more sophisticated vocabulary
- Include at least one comma or question mark
- Include ONE or TWO challenges from: homophones (their/there/they're, where/wear), contractions (wouldn't, couldn't, they've), possessive apostrophes`,

  Confident: `Generate 3 dictation sentences for a 6-7 year old practising for UK 7+ entrance exams at confident level.
Each sentence should:
- Be 18-22 words long
- Include varied punctuation (comma, question mark OR exclamation mark, speech marks if natural)
- Include TWO challenges: a homophone AND a contraction or possessive apostrophe
- Use vocabulary that is challenging but age-appropriate`,

  Stretch: `Generate 3 dictation sentences for a 6-7 year old practising for St Paul's Juniors 7+ entrance exam at stretch/exam level.
Each sentence should:
- Be 20-25 words long
- Include sophisticated vocabulary (slightly above typical 6-year-old level — this is an elite exam)
- Include varied punctuation including speech marks, commas, and question or exclamation marks
- Include MULTIPLE challenges: at least one homophone AND one contraction AND correct apostrophe use
- Mirror the difficulty of SPJ 7+ dictation passages`,
}

export const generateSentences = onCall(
  { secrets: [anthropicKey] },
  async (request) => {
    const { level } = request.data as { level: string }
    if (!LEVEL_PROMPTS[level]) {
      throw new HttpsError('invalid-argument', `Unknown level: ${level}`)
    }

    const client = new Anthropic({ apiKey: anthropicKey.value() })

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `${LEVEL_PROMPTS[level]}

Return ONLY a JSON array of 3 strings, no markdown fences, no explanation. Example format:
["Sentence one here.", "Sentence two here.", "Sentence three here."]`,
      }],
    })

    const text = (response.content[0] as { text: string }).text.trim()
    try {
      const sentences: string[] = JSON.parse(text)
      if (!Array.isArray(sentences) || sentences.length !== 3) {
        throw new Error('Expected array of 3 strings')
      }
      return { sentences }
    } catch {
      throw new HttpsError('internal', 'Failed to parse generated sentences')
    }
  }
)
