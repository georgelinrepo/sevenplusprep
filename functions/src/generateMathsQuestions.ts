// functions/src/generateMathsQuestions.ts
import Anthropic from '@anthropic-ai/sdk'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { anthropicKey } from './generateSentences'

const LEVEL_CALIBRATION: Record<string, string> = {
  Beginner: 'straightforward: simple number bonds to 20, counting, basic shape names, simple time (o\'clock, half past)',
  Developing: 'moderate: addition/subtraction within 100, 2× and 5× tables, simple fractions (half, quarter), coins to £1',
  Confident: 'challenging: all four operations within 200, all times tables to 10×, fractions of amounts, time intervals, word problems',
  Stretch: 'exam-level: multi-step problems, all tables to 12×, fractions/decimals, complex word problems, sequences — mirroring actual SPJ 7+ difficulty',
}

export const generateMathsQuestions = onCall(
  { secrets: [anthropicKey], region: 'europe-west2' },
  async (request) => {
    const { level } = request.data as { level: string }
    if (!LEVEL_CALIBRATION[level]) {
      throw new HttpsError('invalid-argument', `Unknown level: ${level}`)
    }

    const client = new Anthropic({ apiKey: anthropicKey.value() })

    let response
    try {
      response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `Generate exactly 15 mental maths questions for a 6-7 year old child practising for the St Paul's Juniors (Colet Court) 7+ entrance exam.

Difficulty: ${LEVEL_CALIBRATION[level]}

Ordering: Q1-5 straightforward arithmetic, Q6-10 tables/fractions/money/time, Q11-15 multi-step word problems and reasoning.

Rules:
- No more than 4 questions from any single category
- The "category" field MUST be one of these exact lowercase strings (no other values allowed): arithmetic, tables, fractions, money, time, word_problem, sequence, measures, shape, reasoning
- Phrase questions as an invigilator reads them aloud (e.g. "What is six multiplied by seven?" not "6×7=")
- Expected answer MUST include units where applicable: money → p or £ (e.g. "45p", "£1.20"), length → cm or m, time → digits or words (e.g. "3:15"), weight → g or kg
- For bare number answers (arithmetic, tables) no units needed
- The "working" field MUST show step-by-step arithmetic to derive the answer — use this to verify correctness before writing the "expected" field

Return ONLY a JSON array of exactly 15 objects, no markdown fences:
[
  { "question": "What is six multiplied by seven?", "working": "6 × 7 = 42", "expected": "42", "category": "tables" },
  { "question": "Tom has twelve sweets. He gives one quarter to his sister and eats half of what remains. How many does he have left?", "working": "quarter of 12 = 3, remaining = 12 - 3 = 9, half of 9 = 4.5", "expected": "4.5", "category": "word_problem" }
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
      if (!Array.isArray(questions) || questions.length !== 15) {
        throw new Error('Expected array of 15 questions')
      }
      const VALID_CATEGORIES = new Set(['arithmetic', 'tables', 'fractions', 'money', 'time', 'word_problem', 'sequence', 'measures', 'shape', 'reasoning'])
      const hasValidShape = questions.every((q: unknown) =>
        typeof (q as Record<string, unknown>).question === 'string' &&
        typeof (q as Record<string, unknown>).expected === 'string' &&
        VALID_CATEGORIES.has((q as Record<string, unknown>).category as string)
      )
      if (!hasValidShape) {
        throw new Error('Question objects have unexpected shape or invalid category')
      }
      const stripped = questions.map(({ working: _w, ...rest }: Record<string, unknown>) => rest)
      return { questions: stripped }
    } catch {
      throw new HttpsError('internal', 'Failed to parse generated questions')
    }
  }
)
