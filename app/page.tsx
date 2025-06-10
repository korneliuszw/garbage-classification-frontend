"use client"
import { useCallback, useRef, useState } from "react";
import { Camera, CameraType } from "react-camera-pro";
import { processImage } from "./recognizeHelper";
import { useResultStore } from "./useResultStore";
import { useRouter } from "next/navigation";


export default function Home() {
  const camera = useRef<CameraType>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [toggleFlag, setToggleFlag] = useState(false);
  const setResult = useResultStore((state) => state.setRecognition)
  const router = useRouter()
  const takePhoto = useCallback(() => {
    const photo = camera.current?.takePhoto("imgData") as ImageData
    if (!photo) return
    setIsLoading(true)
    const canvas = new OffscreenCanvas(photo.width, photo.height)
    canvas.getContext('2d')!.putImageData(photo, 0, 0)
    canvas.convertToBlob({ type: "image/webp", quality: 0.95 })
      .then(blob => processImage(blob, toggleFlag))
      .then((e) => {
        console.debug('done', e)
        setResult(e)
        router.push('/result')
      }).finally(() => setIsLoading(false))
  }, [toggleFlag])

  return (
    <div>
      <Camera ref={camera} facingMode="environment" errorMessages={{
        noCameraAccessible: "Nie udalo sie otworzyc kamery",
        permissionDenied: "Brak uprawnien do kamery",
        switchCamera: "Zmiana kamery",
        canvas: "Nie udalo sie utworzyc podgladu"
      }} />
      <div className="fixed top-4 left-4 z-50 flex items-center gap-3 cursor-pointer select-none">
        <label className="relative flex items-center">
          <input
            type="checkbox"
            checked={toggleFlag}
            onChange={() => setToggleFlag(c => !c)}
            className="peer absolute w-11 h-6 opacity-0 cursor-pointer"
          />
          <span className="block w-11 h-6 bg-gray-300 rounded-full transition-colors duration-200 peer-checked:bg-blue-600"></span>
          <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 peer-checked:translate-x-5"></span>
        </label>
        <span className="text-base text-gray-900 ml-2 bg-white px-2 py-0.5 rounded-md shadow">
          {toggleFlag ? " multiple objects" : " One object"}
        </span>
      </div>
      <div className="fixed w-full flex justify-center p-2 bottom-4">
        <button disabled={isLoading} className="w-36 bottom-4 rounded-full bg-blue-500 p-2" onClick={takePhoto}>{isLoading ? "Skanowanie..." : "Skanuj"}</button>
      </div>
    </div>
  );
}
