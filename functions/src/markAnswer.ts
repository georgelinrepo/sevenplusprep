// functions/src/markAnswer.ts
import Anthropic from '@anthropic-ai/sdk'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { anthropicKey } from './generateSentences'

const MARKING_PROMPT = (correct: string, childAnswer: string) => `
You are marking a dictation exercise for a 6-7 year old child practising for UK 7+ entrance exams.

Correct sentence: "${correct}"
Child's answer: "${childAnswer}"

Compare the two sentences and identify errors. Ignore extra spaces or minor whitespace differences.

Error types:
- "homophone": child used the wrong homophone (e.g. "there" instead of "their")
- "contraction": child got a contraction wrong (e.g. wrote "its" instead of "it's", or "dont" instead of "don't")
- "punctuation": missing or wrong punctuation mark, wrong capitalisation
- "spelling": a spelling mistake that is not a homophone or contraction error

Return ONLY valid JSON, no markdown fences:
{
  "score": <number 0-100>,
  "errors": [
    { "type": "homophone"|"contraction"|"punctuation"|"spelling", "word": "<what child wrote>", "correction": "<correct version>" }
  ]
}

Score guide: 100 = perfect, deduct ~15 points per error. Minimum 0.
If the answer is perfect, return { "score": 100, "errors": [] }.`

export const markAnswer = onCall(
  { secrets: [anthropicKey], region: 'europe-west2' },
  async (request) => {
    const { correct, childAnswer } = request.data as { correct: string; childAnswer: string }
    if (!correct || !childAnswer) {
      throw new HttpsError('invalid-argument', 'correct and childAnswer are required')
    }

    console.log('markAnswer called', { correct, childAnswer })
    const client = new Anthropic({ apiKey: anthropicKey.value() })

    let response
    try {
      response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{ role: 'user', content: MARKING_PROMPT(correct, childAnswer) }],
      })
    } catch (e) {
      console.error('Anthropic API error:', e)
      throw new HttpsError('internal', `Anthropic API error: ${e instanceof Error ? e.message : String(e)}`)
    }

    const raw = (response.content[0] as { text: string }).text.trim()
    console.log('Anthropic response:', raw)
    // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    try {
      const result = JSON.parse(text)
      if (typeof result.score !== 'number' || !Array.isArray(result.errors)) {
        throw new Error('Invalid response shape')
      }
      return result
    } catch (e) {
      console.error('Parse error:', e, 'Raw text:', text)
      throw new HttpsError('internal', 'Failed to parse marking response')
    }
  }
)
