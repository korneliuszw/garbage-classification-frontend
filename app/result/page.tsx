"use client"
import { useState } from "react"
import { classMap } from "../constants"
import { RecognitionResult } from "../recognizeHelper"
import { useResultStore } from "../useResultStore"
import { useRouter } from "next/navigation"

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
    const [submittedIds, setSubmittedIds] = useState<number[]>([])
    const router = useRouter()

    const handleSubmitValidLabel = async (result: RecognitionResult) => {
        const newLabelValue = (document.getElementsByName(`valid-label-${result.id}`)[0]! as HTMLSelectElement).value
        if (!result.image) return console.error('no image?')
        setIsLoading(true)
        try {
            await uploadFeedback(result.image.blob, newLabelValue)
            setSubmittedIds(ids => [...ids, result.id])
        } finally { setIsLoading(false) }
    }
    const scanNext = () => {
        router.replace("/")
    }
    return <main>{result?.results.map(s => (
        <section key={s.id} className="flex-col justify-items-center align-center">
            <h2>Wykryto smiecia (detection): {s.detectedClass} ({s.detectionConfidence * 100}%)</h2>
            <h1>Sklasyfikowano smiecia (classification): {s.classifiedAs} ({s.confidence * 100}%)</h1>
            <h3>Wyrzuc do pojemnika na {s.verdict}</h3>
            <img src={s.getImageUrl() as string} />
            <select className="col-start-1 row-start-1 appearance-none bg-gray-50 dark:bg-gray-800 p-3 m-3" name={`valid-label-${s.id}`} defaultValue={s.classifiedAs}>
                {classMap.map((val) => <option key={val} value={val} >{val}</option>)}
            </select>
            <button disabled={isLoading || submittedIds.includes(s.id)}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                type="button"
                onClick={() => handleSubmitValidLabel(s)}
            >{submittedIds.includes(s.id) ? "Submitted" : isLoading ? "Sending..." : "Submit correct label"}</button>
        </section>
    )) ?? <div>Nie wykryto?</div>}
        <button className="fixed bottom-20 right-4 bg-green-500 rounded-full p-4" type="button" onClick={scanNext}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
            </svg>
        </button>
    </main>
}