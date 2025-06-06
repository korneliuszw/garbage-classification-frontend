import { create } from 'zustand';
import { RecognitionResponse } from './recognizeHelper';

export const useResultStore = create<{recognition?: RecognitionResponse, setRecognition: (recogition: RecognitionResponse) => void}>((set) => ({
    recognition: undefined,
    setRecognition: (b) => set({recognition: b})
}));