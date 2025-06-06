"use client"
import { useState } from "react"
import { classMap } from "../constants"
import { RecognitionResponse, RecognitionResult } from "../recognizeHelper"
import { useResultStore } from "../useResultStore"

async function uploadFeedback(blob: Blob, label: string) {
    const formData = new FormData()
    const file = new File([blob], 'image.png', { type: 'image/png' })
    formData.append('file', file)
    formData.append('label', label)

    const res = await fetch('/api/feedback', {
        method: 'POST',
        body: formData,
    })

    const data = await res.json()
    return data.url // public URL of the saved image
}


export default function DetectionResult() {
    const result = useResultStore(state => state.recognition)
    const [isLoading, setIsLoading] = useState(false)
    const handleSubmitValidLabel = async (result: RecognitionResult) => {
        const newLabelValue = (document.getElementsByName(`valid-label-${result.id}`)[0]! as HTMLSelectElement).value
        if (!result.image) return console.error('no image?')
        setIsLoading(true)
        try {
            await uploadFeedback(result.image.blob, newLabelValue)
        } finally { setIsLoading(false) }

    }
    return result?.results.map(s => (
        <div key={s.id} className="flex-col justify-items-center align-center">
            <h1>Wyrzuc do smietnika (classification): {s.classifiedAs} ({s.confidence * 100}%)</h1>
            <h2>Wykryto smiecia (detection): {s.detectedClass} ({s.detectionConfidence * 100}%)</h2>
            <img src={s.getImageUrl()} />
            <select className="col-start-1 row-start-1 appearance-none bg-gray-50 dark:bg-gray-800 p-3 m-3" name={`valid-label-${s.id}`} defaultValue={s.classifiedAs}>
                {classMap.map((val) => <option key={val} value={val} >{val}</option>)}
            </select>
            <button disabled={isLoading} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" type="button" onClick={() => handleSubmitValidLabel(s)}>{isLoading ? "Sending..." : "Submit correct label"}</button>
        </div >
    )) ?? <div>Nie wykryto?</div>
}