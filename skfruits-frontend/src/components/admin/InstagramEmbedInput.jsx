import { useState } from "react";
import { useToast } from "../../context/ToastContext";

/**
 * Instagram embed input component for admin product form
 * Allows adding, enabling/disabling, reordering, and removing Instagram post/reel URLs
 */
export default function InstagramEmbedInput({ instagramEmbeds, onChange }) {
  const toast = useToast();
  const [newUrl, setNewUrl] = useState("");

  // Validate Instagram URL
  const isValidInstagramUrl = (url) => {
    const trimmed = url.trim();
    const instagramPattern = /^https:\/\/(www\.)?instagram\.com\/(p|reel)\/[\w-]+\/?(\?.*)?$/;
    return instagramPattern.test(trimmed);
  };

  // Add new Instagram embed
  const handleAddEmbed = () => {
    const trimmed = newUrl.trim();
    
    if (!trimmed) {
      toast.error("Please enter an Instagram URL");
      return;
    }

    if (!isValidInstagramUrl(trimmed)) {
      toast.error("Invalid Instagram URL. Use format: https://www.instagram.com/p/... or https://www.instagram.com/reel/...");
      return;
    }

    // Check for duplicates
    if (instagramEmbeds.some((embed) => embed.url === trimmed)) {
      toast.error("This Instagram post is already added");
      return;
    }

    const newEmbed = {
      url: trimmed,
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    onChange([...instagramEmbeds, newEmbed]);
    setNewUrl("");
    toast.success("Instagram post added");
  };

  // Remove embed
  const handleRemove = (index) => {
    const updated = instagramEmbeds.filter((_, i) => i !== index);
    onChange(updated);
    toast.success("Instagram post removed");
  };

  // Toggle enabled status
  const handleToggleEnabled = (index) => {
    const updated = instagramEmbeds.map((embed, i) =>
      i === index ? { ...embed, enabled: !embed.enabled } : embed
    );
    onChange(updated);
  };

  // Move embed up in the list
  const handleMoveUp = (index) => {
    if (index === 0) return;
    const updated = [...instagramEmbeds];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onChange(updated);
  };

  // Move embed down in the list
  const handleMoveDown = (index) => {
    if (index === instagramEmbeds.length - 1) return;
    const updated = [...instagramEmbeds];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onChange(updated);
  };

  // Extract Instagram post ID from URL for preview
  const getInstagramId = (url) => {
    const match = url.match(/\/(p|reel)\/([\w-]+)/);
    return match ? match[2] : null;
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        Instagram Media
      </label>

      {/* Add new Instagram URL */}
      <div className="mb-4 p-4 rounded-lg border-2 border-gray-200 bg-gray-50">
        <div className="flex gap-2">
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddEmbed())}
            placeholder="https://www.instagram.com/p/... or /reel/..."
            className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-pink-500 transition"
          />
          <button
            type="button"
            onClick={handleAddEmbed}
            className="px-4 py-2 bg-pink-500 text-white rounded-lg font-semibold hover:bg-pink-600 transition shrink-0"
          >
            Add Instagram Post
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Add Instagram post or reel URL. Only posts from instagram.com/p/ or instagram.com/reel/ are supported.
        </p>
      </div>

      {/* List of added Instagram embeds */}
      {instagramEmbeds.length > 0 && (
        <div className="space-y-3">
          {instagramEmbeds.map((embed, index) => {
            const instagramId = getInstagramId(embed.url);
            return (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 transition ${
                  embed.enabled
                    ? "border-pink-200 bg-pink-50"
                    : "border-gray-200 bg-gray-50 opacity-60"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Preview placeholder */}
                  <div className="w-16 h-16 shrink-0 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </div>

                  {/* Embed info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {embed.url}
                    </p>
                    {instagramId && (
                      <p className="text-xs text-gray-500 mt-1">ID: {instagramId}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Added: {new Date(embed.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Move up/down */}
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        title="Move up"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === instagramEmbeds.length - 1}
                        className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        title="Move down"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    {/* Enable/disable toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleEnabled(index)}
                      className={`px-3 py-1 rounded text-xs font-medium transition ${
                        embed.enabled
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      }`}
                      title={embed.enabled ? "Click to disable" : "Click to enable"}
                    >
                      {embed.enabled ? "Enabled" : "Disabled"}
                    </button>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition"
                      title="Remove"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {instagramEmbeds.length === 0 && (
        <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
          No Instagram posts added yet
        </div>
      )}
    </div>
  );
}
