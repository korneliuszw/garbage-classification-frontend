import { useState } from "react"
import { classMap } from "../constants"
import { RecognitionResult } from "../recognizeHelper"

const IMAGE_MARGIN = 200

interface DetectionSingleResultProps {
    result: RecognitionResult
}

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


export const DetectionSingleResult = ({ result }: DetectionSingleResultProps) => {
    const [isLoading, setIsLoading] = useState(false)
    const [submitted, setIsSubmitted] = useState(false)
    const handleSubmitValidLabel = async () => {
        const newLabelValue = (document.getElementsByName(`valid-label-${result.id}`)[0]! as HTMLSelectElement).value
        if (!result.image) return console.error('no image?')
        setIsLoading(true)
        try {
            await uploadFeedback(result.image.blob, newLabelValue)
            setIsSubmitted(true)
        } finally { setIsLoading(false) }
    }
    const initializeCanvas = (canvas: HTMLCanvasElement) => {
        const ctx = canvas?.getContext('2d')
        if (!ctx || !result.image) return
        const img = new Image()
        img.onload = () => {
            canvas.width = img.naturalWidth
            canvas.height = img.naturalHeight
            ctx.drawImage(img, 0, 0)
            console.debug('image drawn', img.naturalWidth, img.naturalHeight)
            ctx.strokeStyle = 'red'
            ctx.lineWidth = 4
            ctx.strokeRect(IMAGE_MARGIN, IMAGE_MARGIN, result.bbox.width, result.bbox.height)
        }
        img.src = result.image?.url
    }
    return (
        <section key={result.id} className="flex flex-col justify-items-center align-center p-1 bg-neutral-200 dark:bg-neutral-800 m-1 rounded gap-1 snap-start">
            <div className="flex gap-2 justify-self-start items-center">
                <div className="bg-gray-600 p-2 pt-1 pb-1 rounded">Kosz</div>
                <span>
                    <b>{result.verdict}</b> ({(result.confidence * 100).toFixed(2)}%)
                </span>
            </div>
            {result.bbox?.width ? <canvas className="max-w-full max-h-full" ref={initializeCanvas} /> : <img src={result.getImageUrl() as string} />}
            <div className="flex items-center justify-center">
                <select className="col-start-1 row-start-1 appearance-none bg-gray-50 dark:bg-gray-800 p-3" name={`valid-label-${result.id}`} defaultValue={result.classifiedAs}>
                    {classMap.map((val) => <option key={val} value={val} >{val}</option>)}
                </select>
                <button disabled={isLoading || submitted}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    type="button"
                    onClick={() => handleSubmitValidLabel()}
                >{submitted ? "Submitted" : isLoading ? "Sending..." : "Submit correct label"}</button>
            </div>
        </section>
    )

}