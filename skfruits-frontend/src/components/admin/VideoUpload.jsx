import { useState, useRef } from "react";

export default function VideoUpload({ videos, existingVideos, onVideosChange, onExistingVideosChange }) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith("video/")
      );
      onVideosChange([...videos, ...newFiles]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).filter((file) =>
        file.type.startsWith("video/")
      );
      onVideosChange([...videos, ...newFiles]);
    }
  };

  const removeVideo = (index) => {
    onVideosChange(videos.filter((_, i) => i !== index));
  };

  const removeExistingVideo = (index) => {
    onExistingVideosChange(existingVideos.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-gray-700">Product Videos (optional)</label>

      {existingVideos.length > 0 && (
        <div>
          <p className="text-sm text-gray-600 mb-2">Existing Videos:</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {existingVideos.map((url, index) => (
              <div key={index} className="relative group rounded-lg overflow-hidden border-2 border-gray-200 bg-black">
                <video
                  src={url}
                  className="w-full aspect-video object-contain"
                  muted
                  playsInline
                  preload="metadata"
                />
                <button
                  type="button"
                  onClick={() => removeExistingVideo(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition ${
          dragActive
            ? "border-pink-500 bg-pink-50"
            : "border-gray-300 hover:border-pink-400 bg-gray-50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*"
          onChange={handleChange}
          className="hidden"
        />
        <div className="text-3xl mb-2">🎬</div>
        <p className="text-gray-600 mb-2 text-sm">
          Drag and drop videos here, or{" "}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-pink-600 hover:text-pink-700 underline font-semibold"
          >
            browse
          </button>
        </p>
        <p className="text-xs text-gray-500">Supports: MP4, WebM (max 5 videos, 50MB each)</p>
      </div>

      {videos.length > 0 && (
        <div>
          <p className="text-sm text-gray-600 mb-2">New Videos to Upload:</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {videos.map((file, index) => (
              <div key={index} className="relative group rounded-lg overflow-hidden border-2 border-gray-200 bg-black">
                <video
                  src={URL.createObjectURL(file)}
                  className="w-full aspect-video object-contain"
                  muted
                  playsInline
                  preload="metadata"
                />
                <button
                  type="button"
                  onClick={() => removeVideo(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
