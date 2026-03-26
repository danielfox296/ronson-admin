import { useState, useCallback, useRef } from 'react';
import { uploadFile } from '../lib/api.js';

interface FileUploadProps {
  onUploaded: (url: string) => void;
}

export default function FileUpload({ onUploaded }: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = '.mp3,.wav,.flac';

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['mp3', 'wav', 'flac'].includes(ext)) {
      setError('Only .mp3, .wav, .flac files are accepted');
      return;
    }
    setFileName(file.name);
    setUploading(true);
    setError('');
    setDone(false);
    try {
      const result = await uploadFile(file);
      setDone(true);
      onUploaded(result.url);
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [onUploaded]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
        dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {done ? (
        <p className="text-green-600 font-medium">Uploaded {fileName}</p>
      ) : uploading ? (
        <p className="text-blue-600">Uploading {fileName}...</p>
      ) : (
        <p className="text-gray-500">
          Drag & drop an audio file here, or click to browse<br />
          <span className="text-xs">.mp3, .wav, .flac</span>
        </p>
      )}
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  );
}
