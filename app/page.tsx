"use client";
import { useCallback, useRef, useState } from "react";
import { processImage } from "./recognizeHelper";
import { useResultStore } from "./useResultStore";
import { useRouter } from "next/navigation";
import Webcam from "react-webcam";

export default function Home() {
  const camera = useRef<Webcam>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [toggleFlag, setToggleFlag] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null); // <- Dodane
  const setResult = useResultStore((state) => state.setRecognition);
  const router = useRouter();

  const takePhoto = useCallback(() => {
    const photo = camera.current?.getScreenshot()
    if (!photo) return
    setIsLoading(true)
    fetch(photo).then(s => s.blob())
      .then(blob => processImage(blob, toggleFlag))
      .then((e) => {
        console.debug('done', e)
        setResult(e)
        router.push('/result')
      }).finally(() => setIsLoading(false))
  }, [toggleFlag])
  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setIsLoading(true);

      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.src = reader.result as string;
        setUploadedImage(reader.result as string); // <- Tutaj zapisujemy obraz
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                processImage(blob, toggleFlag)
                  .then((e) => {
                    console.debug("done", e);
                    setResult(e);
                    router.push("/result");
                  })
                  .finally(() => setIsLoading(false));
              }
            },
            "image/webp",
            0.95
          );
        };
      };
      reader.readAsDataURL(file);
    },
    [toggleFlag, setResult, router]
  );
  return (
    <div>
      <Webcam className="w-screen h-screen object-cover" ref={camera} audio={false} screenshotFormat="image/webp" videoConstraints={{ width: 1440, height: 1080, facingMode: 'environment' }} imageSmoothing={false} forceScreenshotSourceSize={true} />
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
        <span className="toggle-label">
            {toggleFlag ? " multiple objects" : " One object"}
        </span>
        </div>

      

      {/* Wyświetl podgląd wgranego zdjęcia */}
      {uploadedImage && (
        <div className="absolute top-4 right-4 border-2 border-white rounded shadow-lg">
          <img
            src={uploadedImage}
            alt="Wgrane zdjęcie"
            className="max-w-xs max-h-60 object-contain"
          />
        </div>
      )}


      {/* Przyciski */}
      <div className="fixed w-full flex justify-center gap-4 p-2 bottom-4">
        <button
          disabled={isLoading}
          className="w-36 rounded-full bg-blue-500 p-2"
          onClick={takePhoto}
        >
          {isLoading ? "Skanowanie..." : "Skanuj"}
        </button>

        <label className="w-36 rounded-full bg-gray-500 p-2 text-white flex items-center justify-center cursor-pointer">
          Wybierz plik
          <input
            type="file"
            accept="image/jpeg, image/png"
            disabled={isLoading}
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>
    </div>    
  );
}
