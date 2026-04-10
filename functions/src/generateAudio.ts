// functions/src/generateAudio.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import TextToSpeech from '@google-cloud/text-to-speech'

const ttsClient = new TextToSpeech.TextToSpeechClient()

export const generateAudio = onCall(
  { region: 'europe-west2' },
  async (request) => {
    const { text } = request.data as { text: string }
    if (!text) throw new HttpsError('invalid-argument', 'text is required')

    const [response] = await ttsClient.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: 'en-GB',
        name: 'en-GB-Neural2-B',
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 0.9,
      },
    })

    if (!response.audioContent) {
      throw new HttpsError('internal', 'No audio content returned from TTS')
    }

    const base64 = Buffer.from(response.audioContent as Uint8Array).toString('base64')
    return { audio: base64 }
  }
)
