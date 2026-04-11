import { describe, it, expect } from 'vitest'
import { markAnswers } from './VerbalEntry'
import type { VerbalQuestion } from '../types'

const synonymQ: VerbalQuestion = {
  number: 1,
  type: 'synonym',
  question: 'Which word means the same as HAPPY?',
  options: ['sad', 'joyful', 'angry', 'tired'],
  answer: 'joyful',
  explanation: 'Joyful means the same as happy.',
}

const analogyQ: VerbalQuestion = {
  number: 2,
  type: 'analogy',
  question: 'Dog is to kennel as bird is to ___',
  answer: 'nest',
  explanation: 'A dog lives in a kennel, just as a bird lives in a nest.',
}

const compoundQ: VerbalQuestion = {
  number: 3,
  type: 'compound_word',
  question: 'TOOTH + ___ = something you use to clean your teeth',
  answer: 'brush',
  explanation: 'Toothbrush is the compound word.',
}

describe('markAnswers', () => {
  it('marks a correct synonym answer', () => {
    const { results } = markAnswers([synonymQ], ['joyful'])
    expect(results[0].correct).toBe(true)
    expect(results[0].childAnswer).toBe('joyful')
    expect(results[0].correctAnswer).toBe('joyful')
  })

  it('marks an incorrect synonym answer', () => {
    const { results } = markAnswers([synonymQ], ['sad'])
    expect(results[0].correct).toBe(false)
    expect(results[0].childAnswer).toBe('sad')
    expect(results[0].correctAnswer).toBe('joyful')
  })

  it('is case-insensitive', () => {
    const { results } = markAnswers([analogyQ], ['NEST'])
    expect(results[0].correct).toBe(true)
  })

  it('trims whitespace before comparing', () => {
    const { results } = markAnswers([compoundQ], ['  brush  '])
    expect(results[0].correct).toBe(true)
  })

  it('calculates totalScore as percentage of correct answers rounded', () => {
    const { totalScore } = markAnswers([synonymQ, analogyQ, compoundQ], ['joyful', 'nest', 'wrong'])
    // 2 out of 3 correct = 66.666... -> rounds to 67
    expect(totalScore).toBe(67)
  })

  it('returns 100 when all correct', () => {
    const { totalScore } = markAnswers([synonymQ, analogyQ], ['joyful', 'nest'])
    expect(totalScore).toBe(100)
  })

  it('returns 0 when all wrong', () => {
    const { totalScore } = markAnswers([synonymQ, analogyQ], ['wrong', 'wrong'])
    expect(totalScore).toBe(0)
  })

  it('passes options through to results for synonym questions', () => {
    const { results } = markAnswers([synonymQ], ['joyful'])
    expect(results[0].options).toEqual(['sad', 'joyful', 'angry', 'tired'])
  })

  it('preserves question type in results', () => {
    const { results } = markAnswers([synonymQ, analogyQ], ['joyful', 'nest'])
    expect(results[0].type).toBe('synonym')
    expect(results[1].type).toBe('analogy')
  })
})
