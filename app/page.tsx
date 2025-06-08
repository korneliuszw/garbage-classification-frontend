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
  const setResult = useResultStore((state: any) => state.setRecognition)
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
  }, [])

  return (
    <div>
      <Camera ref={camera} facingMode="environment" errorMessages={{
        noCameraAccessible: "Nie udalo sie otworzyc kamery",
        permissionDenied: "Brak uprawnien do kamery",
        switchCamera: "Zmiana kamery",
        canvas: "Nie udalo sie utworzyc podgladu"
      }} />
      <div className="fixed w-full flex justify-center p-2 bottom-4">
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={toggleFlag}
            onClick={async e => {
              // const checked = e.target.;
              setToggleFlag(c => !c);
            }}
          />
          <span className="slider"></span>
          <span className="toggle-label">{toggleFlag ? " multiple objects" : " One object"}</span>
        </label>
      </div>
      <div className="fixed w-full flex justify-center p-2 bottom-4">
        <button disabled={isLoading} className="w-36 bottom-4 rounded-full bg-blue-500 p-2" onClick={takePhoto}>{isLoading ? "Skanowanie..." : "Skanuj"}</button>
      </div>
    </div>
  );
}
