import { useState, useEffect, useRef, useCallback } from 'react';
import type { Song, Album } from '../types/music';

export type RepeatMode = 'off' | 'all' | 'one';

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  const [volume, setVolumeState] = useState<number>(() => {
    const saved = localStorage.getItem('myusic_volume');
    return saved !== null ? parseFloat(saved) : 0.8;
  });

  const [queue, setQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(-1);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');

  // Live refs to prevent stale closure bugs in audio event listeners
  const queueRef = useRef(queue);
  queueRef.current = queue;

  const queueIndexRef = useRef(queueIndex);
  queueIndexRef.current = queueIndex;

  const isShuffleRef = useRef(isShuffle);
  isShuffleRef.current = isShuffle;

  const repeatModeRef = useRef(repeatMode);
  repeatModeRef.current = repeatMode;

  const currentSongRef = useRef(currentSong);
  currentSongRef.current = currentSong;

  const playSong = useCallback(
    (song: Song, songList: Song[] = []) => {
      if (!audioRef.current) return;

      const activeQueue = songList.length > 0 ? songList : [song];
      const index = activeQueue.findIndex((s) => s.filePath === song.filePath || s.id === song.id);

      setQueue(activeQueue);
      setQueueIndex(index !== -1 ? index : 0);
      setCurrentSong(song);

      const initialDuration = song.duration > 0 ? song.duration : 0;
      setDuration(initialDuration);
      setCurrentTime(0);

      const streamUrl = `atom://track?path=${encodeURIComponent(song.filePath)}`;
      audioRef.current.src = streamUrl;
      audioRef.current.currentTime = 0;

      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error("Playback error:", err));
    },
    []
  );

  const handleNext = useCallback(() => {
    const currentQ = queueRef.current;
    const currentIndex = queueIndexRef.current;
    const shuffle = isShuffleRef.current;
    const repeat = repeatModeRef.current;
    const activeSong = currentSongRef.current;

    if (currentQ.length === 0) return;

    if (repeat === 'one' && activeSong && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      return;
    }

    let nextIdx = currentIndex + 1;
    if (shuffle) {
      nextIdx = Math.floor(Math.random() * currentQ.length);
    } else if (nextIdx >= currentQ.length) {
      if (repeat === 'all') {
        nextIdx = 0; // Loop back to start of queue
      } else {
        setIsPlaying(false);
        return; // End of queue reached
      }
    }

    const nextSong = currentQ[nextIdx];
    if (nextSong) {
      playSong(nextSong, currentQ);
    }
  }, [playSong]);

  // Initialize audio element and bind events
  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onloadedmetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    audio.ondurationchange = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    audio.onended = () => {
      handleNext();
    };

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [handleNext]);

  const setVolume = (val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    setVolumeState(clamped);
    localStorage.setItem('myusic_volume', clamped.toString());
  };

  const playAlbum = useCallback(
    (album: Album, allSongs: Song[], shuffle = false) => {
      const albumSongs = allSongs
        .filter((s) => s.album.toLowerCase() === album.title.toLowerCase())
        .sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0));

      if (albumSongs.length === 0) return;

      if (shuffle) {
        const randomIndex = Math.floor(Math.random() * albumSongs.length);
        playSong(albumSongs[randomIndex], albumSongs);
        setIsShuffle(true);
      } else {
        playSong(albumSongs[0], albumSongs);
        setIsShuffle(false);
      }
    },
    [playSong]
  );

  const playNext = useCallback((song: Song) => {
    setQueue((prev) => {
      if (prev.length === 0) return [song];
      const newQueue = [...prev];
      const insertAt = queueIndex !== -1 ? queueIndex + 1 : 0;
      newQueue.splice(insertAt, 0, song);
      return newQueue;
    });
  }, [queueIndex]);

  const addToQueue = useCallback((song: Song) => {
    setQueue((prev) => [...prev, song]);
  }, []);

  const togglePlayPause = () => {
    if (!audioRef.current || !currentSong) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const seek = (timeInSeconds: number) => {
    if (!audioRef.current) return;
    const effectiveDur = duration > 0 ? duration : (currentSong?.duration || 0);
    const clamped = Math.max(0, Math.min(effectiveDur, timeInSeconds));

    audioRef.current.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const handlePrev = useCallback(() => {
    if (!audioRef.current || queue.length === 0) return;

    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    let prevIdx = queueIndex - 1;
    if (prevIdx < 0) {
      prevIdx = queue.length - 1;
    }
    const prevSong = queue[prevIdx];
    if (prevSong) {
      playSong(prevSong, queue);
    }
  }, [queue, queueIndex, playSong]);

  const toggleShuffle = () => setIsShuffle((prev) => !prev);

  const toggleRepeat = () => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  return {
    currentSong,
    isPlaying,
    currentTime,
    duration: duration > 0 ? duration : (currentSong?.duration || 0),
    volume,
    queue,
    queueIndex,
    isShuffle,
    repeatMode,
    playSong,
    playAlbum,
    togglePlayPause,
    seek,
    setVolume,
    handleNext,
    handlePrev,
    toggleShuffle,
    toggleRepeat,
    playNext,
    addToQueue
  };
}