import { create } from 'zustand';
import { RecognitionResponse } from './recognizeHelper';

export const useResultStore = create<{recognition?: RecognitionResponse, setRecognition: (recogition: RecognitionResponse) => void}>((set, get) => ({
    recognition: undefined,
    setRecognition: (b) => {
        const current = get().recognition
        current?.cleanup()
        return set({recognition: b})
    }
}));