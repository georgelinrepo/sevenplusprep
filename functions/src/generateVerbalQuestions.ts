// functions/src/generateVerbalQuestions.ts
import Anthropic from '@anthropic-ai/sdk'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { anthropicKey } from './generateSentences'

const LEVEL_CALIBRATION: Record<string, string> = {
  Beginner: 'standard 7+ level — straightforward vocabulary, simple word relationships, no tricks. Suitable for a 6-year-old working at expected level.',
  Developing: 'SPJ 7+ level — richer vocabulary, some inference required, moderate complexity. Suitable for a 6-year-old working slightly above expected level.',
  Confident: 'SPJ stretch level — abstract relationships, challenging vocabulary, multi-step reasoning. Suitable for a 6-7 year old working at 7-8 year level.',
  Stretch: 'SPJ exam-level stretch — vocabulary and reasoning a gifted 6-year-old working at 7-9 year level would find challenging but achievable with effort. Never trivially guessable.',
}

const VALID_TYPES = new Set(['synonym', 'odd_word_out', 'analogy', 'word_code', 'hidden_word', 'letter_sequence'])

export const generateVerbalQuestions = onCall(
  { secrets: [anthropicKey], region: 'europe-west2' },
  async (request) => {
    const { level, paperLength } = request.data as { level: string; paperLength: number }

    if (!LEVEL_CALIBRATION[level]) {
      throw new HttpsError('invalid-argument', `Unknown level: ${level}`)
    }
    if (![10, 20, 30].includes(paperLength)) {
      throw new HttpsError('invalid-argument', `Invalid paperLength: ${paperLength}`)
    }

    const perType = Math.floor(paperLength / 6)
    const remainder = paperLength % 6
    const types = ['synonym', 'odd_word_out', 'analogy', 'word_code', 'hidden_word', 'letter_sequence']
    const typeCounts = types.map((t, i) => `${t}: ${perType + (i < remainder ? 1 : 0)}`).join(', ')

    const client = new Anthropic({ apiKey: anthropicKey.value() })

    let response
    try {
      response = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 8192,
        messages: [{
          role: 'user',
          content: `Generate exactly ${paperLength} verbal reasoning questions for a 6-7 year old child practising for the St Paul's Juniors (Colet Court) 7+ entrance exam.

Difficulty: ${LEVEL_CALIBRATION[level]}

Question type distribution (EXACT counts required): ${typeCounts}

Ordering: questions must get progressively harder — easiest first, hardest last.

Question type specifications:
- synonym: "Which word means the same as ANCIENT? Circle one: old / new / modern / young" — exactly 4 options, one correct. The "options" array must contain all 4 words. The "answer" is the correct option.
- odd_word_out: "Circle the word that does not belong: pleasant / agreeable / delightful / tolerable / vile" — exactly 5 words in "options", one is the odd one out. The "answer" is the odd word. Reason must require genuine reasoning, not just obvious categories.
- analogy: "Conductor is to orchestra as captain is to ___" — no options field. The "answer" is the missing word. Use abstract/conceptual relationships at higher levels.
- word_code: At Beginner use number codes (A=1, B=2 etc): "If RAIN = 18-1-9-14, what is SNOW?" At Confident/Stretch use letter shift codes: "If BREAD is coded as CSFE B, what is WATER?" — no options field.
- hidden_word: "Find the hidden word: The stamp editor arrived late" (answer: "ample" hidden across "stamp editor") — no options field. The "answer" is the hidden word. At Advanced: longer hidden words, less obvious position.
- letter_sequence: "What letter comes next? A, E, I, M, ___" — no options field. The "answer" is the next letter. Beginner: simple +2/+3 gaps. Stretch: variable gaps e.g. B, D, G, K, P, ___ (gaps 2,3,4,5,6).

Rules:
- The "type" field MUST be exactly one of: synonym, odd_word_out, analogy, word_code, hidden_word, letter_sequence
- Never repeat question patterns or reuse the same words
- All answers must be unambiguously correct
- Explanations should be short and child-friendly (max 15 words)

Return ONLY a JSON array of exactly ${paperLength} objects, no markdown fences:
[
  {
    "number": 1,
    "type": "synonym",
    "question": "Which word means the same as HAPPY? Circle one: sad / joyful / angry / tired",
    "options": ["sad", "joyful", "angry", "tired"],
    "answer": "joyful",
    "explanation": "Happy means feeling good, and joyful means the same thing."
  },
  {
    "number": 2,
    "type": "analogy",
    "question": "Dog is to kennel as bird is to ___",
    "answer": "nest",
    "explanation": "A dog lives in a kennel, just as a bird lives in a nest."
  }
]`,
        }],
      })
    } catch (e) {
      console.error('Anthropic API error:', e)
      throw new HttpsError('internal', `Anthropic API error: ${e instanceof Error ? e.message : String(e)}`)
    }

    const raw = (response.content[0] as { text: string }).text.trim()
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    try {
      const questions = JSON.parse(text)
      if (!Array.isArray(questions) || questions.length !== paperLength) {
        throw new Error(`Expected array of ${paperLength} questions, got ${Array.isArray(questions) ? questions.length : 'non-array'}`)
      }
      const hasValidShape = questions.every((q: unknown) => {
        const obj = q as Record<string, unknown>
        if (typeof obj.number !== 'number') return false
        if (!VALID_TYPES.has(obj.type as string)) return false
        if (typeof obj.question !== 'string') return false
        if (typeof obj.answer !== 'string') return false
        if (typeof obj.explanation !== 'string') return false
        if ((obj.type === 'synonym' || obj.type === 'odd_word_out') && (!Array.isArray(obj.options) || (obj.options as unknown[]).length < 4)) return false
        return true
      })
      if (!hasValidShape) {
        throw new Error('Question objects have unexpected shape or invalid type')
      }
      return { questions }
    } catch (e) {
      console.error('Parse error:', e, 'Raw:', text)
      throw new HttpsError('internal', 'Failed to parse generated questions')
    }
  }
)
