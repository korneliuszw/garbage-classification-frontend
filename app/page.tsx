"use client";
import { useCallback, useRef, useState } from "react";
import { Camera, CameraType } from "react-camera-pro";
import { processImage } from "./recognizeHelper";
import { useResultStore } from "./useResultStore";
import { useRouter } from "next/navigation";

export default function Home() {
  const camera = useRef<CameraType>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toggleFlag, setToggleFlag] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null); // <- Dodane
  const setResult = useResultStore((state) => state.setRecognition);
  const router = useRouter();

  const takePhoto = useCallback(() => {
    const photo = camera.current?.takePhoto("imgData") as ImageData;
    if (!photo) return;
    setIsLoading(true);
    const canvas = new OffscreenCanvas(photo.width, photo.height);
    canvas.getContext("2d")!.putImageData(photo, 0, 0);
    canvas
      .convertToBlob({ type: "image/webp", quality: 0.95 })
      .then((blob) => processImage(blob, toggleFlag))
      .then((e) => {
        console.debug("done", e);
        setResult(e);
        router.push("/result");
      })
      .finally(() => setIsLoading(false));
  }, [toggleFlag, setResult, router]);

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
    <div className="relative min-h-screen bg-black text-white flex flex-col items-center">
      <Camera
        ref={camera}
        facingMode="environment"
        errorMessages={{
          noCameraAccessible: "Nie udalo sie otworzyc kamery",
          permissionDenied: "Brak uprawnien do kamery",
          switchCamera: "Zmiana kamery",
          canvas: "Nie udalo sie utworzyc podgladu",
        }}
      />

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

      {/* Przełącznik trybu */}
      <div className="fixed w-full flex justify-center p-2 bottom-20">
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={toggleFlag}
            onChange={(e) => setToggleFlag(e.target.checked)}
          />
          <span className="slider"></span>
          <span className="toggle-label">
            {toggleFlag ? " multiple objects" : " One object"}
          </span>
        </label>
      </div>

      {/* Przyciski */}
      <div className="fixed w-full flex justify-center gap-4 p-2 bottom-4">
        <button
          disabled={isLoading}
          className="w-36 rounded-full bg-blue-500 p-2"
          onClick={takePhoto}
        >
          {isLoading ? "Skanowanie..." : "Skanuj"}
        </button>
        <input
          type="file"
          accept="image/jpeg, image/png"
          disabled={isLoading}
          onChange={handleFileUpload}
          className="w-36 rounded-full bg-gray-500 p-2 file:text-white"
        />
      </div>
    </div>
  );
}
