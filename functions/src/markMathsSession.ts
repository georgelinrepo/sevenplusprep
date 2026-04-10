// functions/src/markMathsSession.ts
import Anthropic from '@anthropic-ai/sdk'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { anthropicKey } from './generateSentences'

interface MathsQuestion {
  question: string
  expected: string
  category: string
}

export const markMathsSession = onCall(
  { secrets: [anthropicKey], region: 'europe-west2' },
  async (request) => {
    const { questions, childAnswers } = request.data as {
      questions: MathsQuestion[]
      childAnswers: string[]
    }

    if (
      !Array.isArray(questions) || questions.length !== 15 ||
      !Array.isArray(childAnswers) || childAnswers.length !== 15
    ) {
      throw new HttpsError('invalid-argument', 'questions and childAnswers must each be arrays of 15')
    }

    const client = new Anthropic({ apiKey: anthropicKey.value() })

    const questionList = questions
      .map((q, i) => `Q${i + 1}: "${q.question}" | Expected: "${q.expected}" | Child wrote: "${childAnswers[i]}"`)
      .join('\n')

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: `Mark these 15 mental maths answers for a 6-7 year old child.

${questionList}

Marking rules:
- Unit equivalence: "45p" = "£0.45" (both correct); bare "45" for a money answer = INCORRECT
- Time equivalence: "3:15" = "quarter past 3" = "quarter past three" (all correct)
- Correct number but wrong/missing unit = INCORRECT; feedback must explain why
- Spelling of number words: accept reasonable attempts (e.g. "forteen" for fourteen = correct)
- For incorrect answers: short, child-friendly feedback (max 10 words)
- For correct answers: feedback = "Correct"
- totalScore = percentage of 15 correct, rounded to nearest integer

Return ONLY valid JSON, no markdown fences:
{
  "results": [
    {
      "question": "<original question text>",
      "expected": "<expected answer>",
      "childAnswer": "<what child wrote>",
      "correct": true,
      "feedback": "Correct",
      "category": "<category from original question>"
    }
  ],
  "totalScore": 80
}`,
      }],
    })

    const raw = (response.content[0] as { text: string }).text.trim()
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    try {
      const result = JSON.parse(text)
      if (!Array.isArray(result.results) || result.results.length !== 15 || typeof result.totalScore !== 'number') {
        throw new Error('Invalid response shape')
      }
      return result
    } catch (e) {
      console.error('Parse error:', e, 'Raw:', text)
      throw new HttpsError('internal', 'Failed to parse marking response')
    }
  }
)
