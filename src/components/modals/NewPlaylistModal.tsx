import React, { useState } from 'react';
import type { Playlist } from '../../types/music';

interface NewPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (playlist: Playlist) => void;
}

const PRESET_COLORS = [
  "#fa2d48", // Apple Red
  "#ff5e3a", // Orange
  "#ff9500", // Gold
  "#34c759", // Green
  "#007aff", // Blue
  "#5856d6", // Indigo
  "#af52de", // Purple
  "#ff2d55"  // Pink
];

export function NewPlaylistModal({ isOpen, onClose, onCreate }: NewPlaylistModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newPlaylist: Playlist = {
      id: "pl_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      name: name.trim(),
      description: description.trim() || undefined,
      songIds: [],
      coverColor: selectedColor,
      createdAt: Date.now()
    };

    onCreate(newPlaylist);
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">New Playlist</h2>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-field">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Playlist"
              autoFocus
              required
            />
          </div>

          <div className="modal-field">
            <label>Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Give your playlist a description"
              rows={3}
            />
          </div>

          <div className="modal-field">
            <label>Cover Color</label>
            <div className="color-swatches">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-swatch ${selectedColor === c ? 'active' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setSelectedColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!name.trim()}>
              Create Playlist
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewPlaylistModal;