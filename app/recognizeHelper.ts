"use client"

const apiUrl = "http://localhost:5000"

// --- Types ---
export interface RecognitionResult {
    id: number;
    detectedClass: string;
    classifiedAs: string;
    verdict: string;
    confidence: number;
    detectionConfidence: number;
    bbox: number[];
    image: ImageBlobInfo | null;
    getImageUrl(): string | null;
    downloadImage(): void;
    cleanup(): void;
}

export interface ImageBlobInfo {
    blob: Blob;
    filename: string;
    url: string;
}

export interface RecognitionMetadata {
    status: string;
    total_objects: number;
    results: Array<{
        id: number;
        detected_class: string;
        classified_as: string;
        verdict: string;
        confidence: number;
        detection_confidence: number;
        bbox: number[];
        file_index: number;
    }>;

}

export interface RecognitionResponse {
    status: string;
    totalObjects: number;
    results: RecognitionResult[];
    cleanup(): void;
}

interface MultipartPart {
    name: string | null;
    filename?: string | null;
    contentType?: string | null;
    data: Uint8Array;
}

async function uploadBlob(blob: Blob) {
  const formData = new FormData()
  const file = new File([blob], 'image.png', { type: 'image/png' })
  formData.append('file', file)

  const res = await fetch('/api/save', {
    method: 'POST',
    body: formData,
  })

  const data = await res.json()
  return data.url // public URL of the saved image
}

// --- Functions ---
async function parseRecognitionResponse(response: Response): Promise<RecognitionResponse> {
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('multipart/form-data')) {
        throw new Error('Response is not multipart/form-data');
    }
    
    // Extract boundary from content-type header
    const boundaryMatch = contentType.match(/boundary=([^;]+)/);
    if (!boundaryMatch) {
        throw new Error('No boundary found in content-type header');
    }
    
    const boundary = boundaryMatch[1];
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Parse multipart data
    const parts = parseMultipartData(uint8Array, boundary);
    
    let metadata: RecognitionMetadata | null = null;
    const imageBlobs = new Map<number, ImageBlobInfo>();
    
    // Process each part
    for (const part of parts) {
        if (part.name === 'metadata') {
            metadata = JSON.parse(new TextDecoder().decode(part.data));
        } else if (part.name && part.name.startsWith('file_')) {
            const fileIndex = parseInt(part.name.replace('file_', ''));
            const blob = new Blob([part.data], { type: part.contentType || 'image/webp' });
            imageBlobs.set(fileIndex, {
                blob: blob,
                filename: part.filename || `file_${fileIndex}.webp`,
                url: URL.createObjectURL(blob)
            });
        }
    }
    console.debug(imageBlobs, metadata, parts)
    
    if (!metadata) {
        throw new Error('No metadata found in response');
    }
    
    // Combine metadata with image blobs
    const results: RecognitionResult[] = metadata.results.map(result => ({
        // Detection/Classification data
        id: result.id,
        detectedClass: result.detected_class,
        classifiedAs: result.classified_as,
        verdict: result.verdict,
        confidence: result.confidence,
        detectionConfidence: result.detection_confidence,
        bbox: result.bbox,
        
        // Image data
        image: imageBlobs.get(result.file_index) || null,
        
        // Helper methods
        getImageUrl() {
            return this.image ? this.image.url : null;
        },
        
        downloadImage() {
            if (this.image) {
                const a = document.createElement('a');
                a.href = this.image.url;
                a.download = this.image.filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        },
        
        // Clean up blob URL when done
        cleanup() {
            if (this.image && this.image.url) {
                URL.revokeObjectURL(this.image.url);
            }
        }
    }));
    
    return {
        status: metadata.status,
        totalObjects: metadata.total_objects,
        results: results,
        
        // Helper to cleanup all blob URLs
        cleanup() {
            results.forEach(result => result.cleanup());
        }
    };
}

/**
 * Parse multipart data from Uint8Array
 */
function parseMultipartData(data: Uint8Array, boundary: string): MultipartPart[] {
    const boundaryBytes = new TextEncoder().encode('--' + boundary);
    const parts: MultipartPart[] = [];
    let start = 0;
    
    while (true) {
        // Find next boundary
        const boundaryIndex = findBytes(data, boundaryBytes, start);
        if (boundaryIndex === -1) break;
        
        // Find start of headers (after boundary + CRLF)
        let headerStart = boundaryIndex + boundaryBytes.length;
        
        // Skip CRLF after boundary
        if (data[headerStart] === 0x0D && data[headerStart + 1] === 0x0A) {
            headerStart += 2;
        }
        
        // Find end of headers (double CRLF)
        const headerEnd = findBytes(data, new Uint8Array([0x0D, 0x0A, 0x0D, 0x0A]), headerStart);
        if (headerEnd === -1) break;
        
        // Parse headers
        const headerBytes = data.slice(headerStart, headerEnd);
        const headerText = new TextDecoder().decode(headerBytes);
        const headers = parseHeaders(headerText);
        
        // Find next boundary to get data end
        const dataStart = headerEnd + 4; // Skip double CRLF
        const nextBoundaryIndex = findBytes(data, boundaryBytes, dataStart);
        
        let dataEnd: number;
        if (nextBoundaryIndex === -1) {
            // Last part - find closing boundary
            const closingBoundary = new TextEncoder().encode('--' + boundary + '--');
            const closingIndex = findBytes(data, closingBoundary, dataStart);
            dataEnd = closingIndex === -1 ? data.length : closingIndex;
        } else {
            dataEnd = nextBoundaryIndex;
        }
        
        // Remove trailing CRLF from data
        while (dataEnd > dataStart && (data[dataEnd - 1] === 0x0A || data[dataEnd - 1] === 0x0D)) {
            dataEnd--;
        }
        
        // Extract data
        const partData = data.slice(dataStart, dataEnd);
        
        parts.push({
            name: headers.name,
            filename: headers.filename,
            contentType: headers.contentType,
            data: partData
        });
        
        start = nextBoundaryIndex === -1 ? data.length : nextBoundaryIndex;
    }
    
    return parts;
}

/**
 * Find byte sequence in Uint8Array
 */
function findBytes(haystack: Uint8Array, needle: Uint8Array, start = 0): number {
    for (let i = start; i <= haystack.length - needle.length; i++) {
        let found = true;
        for (let j = 0; j < needle.length; j++) {
            if (haystack[i + j] !== needle[j]) {
                found = false;
                break;
            }
        }
        if (found) return i;
    }
    return -1;
}

/**
 * Parse multipart headers
 */
function parseHeaders(headerText: string): { name: string | null, filename?: string | null, contentType?: string | null } {
    const headers: { name: string | null, filename?: string | null, contentType?: string | null } = { name: null, filename: null, contentType: null };
    const lines = headerText.split('\r\n');
    
    for (const line of lines) {
        if (line.toLowerCase().startsWith('content-disposition:')) {
            const nameMatch = line.match(/name="([^"]+)"/);
            if (nameMatch) headers.name = nameMatch[1];
            
            const filenameMatch = line.match(/filename="([^"]+)"/);
            if (filenameMatch) headers.filename = filenameMatch[1];
        } else if (line.toLowerCase().startsWith('content-type:')) {
            headers.contentType = line.split(':')[1].trim();
        }
    }
    
    return headers;
}

export async function processImage(blob: Blob, toggleFlag?: boolean): Promise<RecognitionResponse> {
    const file = new File([blob], "image.webp", {type: "image/webp"})
    const formData = new FormData()
    formData.append('file', file)
    if (toggleFlag !== undefined) {
        formData.append('toggle_flag', toggleFlag.toString())
    }
    const response = await fetch(`${apiUrl}/recognize`, {
        method: "POST",
        body: formData
    })
    const res =  await parseRecognitionResponse(response)
    await uploadBlob(blob)
    return res
}