import { useState, useEffect, useRef, useCallback } from 'react';
import type { Song, Album } from '../types/music';

export type RepeatMode = 'off' | 'all' | 'one';

export function useAudioPlayer() {
  // Dual-channel audio references for seamless crossfading
  const audio1Ref = useRef<HTMLAudioElement | null>(null);
  const audio2Ref = useRef<HTMLAudioElement | null>(null);
  const activeChannelRef = useRef<'1' | '2'>('1');
  const isCrossfadingRef = useRef<boolean>(false);
  const crossfadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // Stored Volume Preference
  const [volume, setVolumeState] = useState<number>(() => {
    const saved = localStorage.getItem('myusic_volume');
    return saved !== null ? parseFloat(saved) : 0.8;
  });
  const volumeRef = useRef<number>(volume);
  volumeRef.current = volume;

  // Stored Crossfade Preference (0 = Off, 1 to 12 seconds)
  const [crossfadeDuration, setCrossfadeDurationState] = useState<number>(() => {
    const saved = localStorage.getItem('myusic_crossfade');
    return saved !== null ? parseInt(saved, 10) : 0;
  });
  const crossfadeRef = useRef<number>(crossfadeDuration);
  crossfadeRef.current = crossfadeDuration;

  const [queue, setQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(-1);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');

  // Live state refs to prevent stale closure issues
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

  const getActiveAudio = useCallback(() => {
    return activeChannelRef.current === '1' ? audio1Ref.current : audio2Ref.current;
  }, []);

  const getInactiveAudio = useCallback(() => {
    return activeChannelRef.current === '1' ? audio2Ref.current : audio1Ref.current;
  }, []);

  // Set & Persist Crossfade Duration
  const setCrossfadeDuration = (seconds: number) => {
    const clamped = Math.max(0, Math.min(12, seconds));
    setCrossfadeDurationState(clamped);
    crossfadeRef.current = clamped;
    localStorage.setItem('myusic_crossfade', clamped.toString());
  };

  // Play song on a specific channel
  const playOnChannel = useCallback((song: Song, targetAudio: HTMLAudioElement | null, targetVol: number) => {
    if (!targetAudio) return;
    targetAudio.src = `atom://track?path=${encodeURIComponent(song.filePath)}`;
    targetAudio.volume = targetVol;
    targetAudio.currentTime = 0;
    targetAudio
      .play()
      .then(() => setIsPlaying(true))
      .catch((err) => console.error("Playback error:", err));
  }, []);

  // Standard Play Song
  const playSong = useCallback(
    (song: Song, songList: Song[] = []) => {
      // Clear any pending crossfade transition
      if (crossfadeTimerRef.current) {
        clearInterval(crossfadeTimerRef.current);
        crossfadeTimerRef.current = null;
      }
      isCrossfadingRef.current = false;

      const activeQueue = songList.length > 0 ? songList : [song];
      const index = activeQueue.findIndex((s) => s.filePath === song.filePath || s.id === song.id);

      setQueue(activeQueue);
      setQueueIndex(index !== -1 ? index : 0);
      setCurrentSong(song);

      const initialDuration = song.duration > 0 ? song.duration : 0;
      setDuration(initialDuration);
      setCurrentTime(0);

      // Stop secondary channel if playing
      const inactive = getInactiveAudio();
      if (inactive) {
        inactive.pause();
        inactive.src = '';
      }

      const active = getActiveAudio();
      playOnChannel(song, active, volumeRef.current);
    },
    [getActiveAudio, getInactiveAudio, playOnChannel]
  );

  // Compute next track index
  const getNextTrackIndex = useCallback(() => {
    const currentQ = queueRef.current;
    const currentIndex = queueIndexRef.current;
    const shuffle = isShuffleRef.current;
    const repeat = repeatModeRef.current;

    if (currentQ.length === 0) return -1;
    if (repeat === 'one') return currentIndex;

    let nextIdx = currentIndex + 1;
    if (shuffle) {
      nextIdx = Math.floor(Math.random() * currentQ.length);
    } else if (nextIdx >= currentQ.length) {
      if (repeat === 'all') nextIdx = 0;
      else return -1;
    }
    return nextIdx;
  }, []);

  // Crossfade Transition Executor
  const startCrossfade = useCallback(() => {
    const nextIdx = getNextTrackIndex();
    if (nextIdx === -1 || nextIdx >= queueRef.current.length) return;

    const nextSong = queueRef.current[nextIdx];
    if (!nextSong) return;

    const outgoingAudio = getActiveAudio();
    const incomingAudio = getInactiveAudio();
    if (!outgoingAudio || !incomingAudio) return;

    isCrossfadingRef.current = true;
    const xfadeSec = crossfadeRef.current;
    const masterVol = volumeRef.current;

    console.log(`[Audio Engine] 🎚️ Starting ${xfadeSec}s crossfade $\to$ "${nextSong.title}"`);

    // Prepare incoming channel
    playOnChannel(nextSong, incomingAudio, 0);

    // Update UI info to next track as it begins fading in
    setQueueIndex(nextIdx);
    setCurrentSong(nextSong);

    const steps = 30; // 30 volume adjustment steps
    const stepInterval = (xfadeSec * 1000) / steps;
    let stepCount = 0;

    crossfadeTimerRef.current = setInterval(() => {
      stepCount++;
      const progress = stepCount / steps; // 0 to 1

      if (outgoingAudio) {
        outgoingAudio.volume = Math.max(0, masterVol * (1 - progress));
      }
      if (incomingAudio) {
        incomingAudio.volume = Math.min(masterVol, masterVol * progress);
      }

      if (stepCount >= steps) {
        if (crossfadeTimerRef.current) clearInterval(crossfadeTimerRef.current);
        crossfadeTimerRef.current = null;

        // Finalize transition: Stop outgoing audio and swap active channels
        if (outgoingAudio) {
          outgoingAudio.pause();
          outgoingAudio.src = '';
          outgoingAudio.volume = masterVol;
        }

        activeChannelRef.current = activeChannelRef.current === '1' ? '2' : '1';
        isCrossfadingRef.current = false;
        console.log(`[Audio Engine] ✅ Crossfade complete.`);
      }
    }, stepInterval);
  }, [getActiveAudio, getInactiveAudio, getNextTrackIndex, playOnChannel]);

  // Standard Next Track
  const handleNext = useCallback(() => {
    if (crossfadeTimerRef.current) {
      clearInterval(crossfadeTimerRef.current);
      crossfadeTimerRef.current = null;
    }
    isCrossfadingRef.current = false;

    const nextIdx = getNextTrackIndex();
    if (nextIdx !== -1 && queueRef.current[nextIdx]) {
      playSong(queueRef.current[nextIdx], queueRef.current);
    } else {
      setIsPlaying(false);
    }
  }, [getNextTrackIndex, playSong]);

  // Standard Previous Track
  const handlePrev = useCallback(() => {
    if (crossfadeTimerRef.current) {
      clearInterval(crossfadeTimerRef.current);
      crossfadeTimerRef.current = null;
    }
    isCrossfadingRef.current = false;

    const active = getActiveAudio();
    if (active && active.currentTime > 3) {
      active.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    let prevIdx = queueIndexRef.current - 1;
    if (prevIdx < 0) prevIdx = queueRef.current.length - 1;
    const prevSong = queueRef.current[prevIdx];
    if (prevSong) {
      playSong(prevSong, queueRef.current);
    }
  }, [getActiveAudio, playSong]);

  // Check for crossfade threshold on audio progress
  const checkCrossfadeTrigger = useCallback((audio: HTMLAudioElement) => {
    const xfadeSec = crossfadeRef.current;
    if (xfadeSec <= 0 || isCrossfadingRef.current) return;

    if (audio.duration && audio.duration > xfadeSec * 2) {
      const remaining = audio.duration - audio.currentTime;
      if (remaining <= xfadeSec && remaining > 0.3) {
        startCrossfade();
      }
    }
  }, [startCrossfade]);

  // Initialize both channels
  useEffect(() => {
    const a1 = new Audio();
    const a2 = new Audio();
    a1.volume = volume;
    a2.volume = volume;

    audio1Ref.current = a1;
    audio2Ref.current = a2;

    const attachEvents = (audio: HTMLAudioElement, channel: '1' | '2') => {
      audio.ontimeupdate = () => {
        if (activeChannelRef.current === channel && !isCrossfadingRef.current) {
          setCurrentTime(audio.currentTime);
          checkCrossfadeTrigger(audio);
        } else if (isCrossfadingRef.current && activeChannelRef.current !== channel) {
          // If crossfading, let incoming channel drive time
          setCurrentTime(audio.currentTime);
        }
      };

      audio.onloadedmetadata = () => {
        if (activeChannelRef.current === channel && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          setDuration(audio.duration);
        }
      };

      audio.onended = () => {
        // Only trigger ended if not currently executing a crossfade
        if (!isCrossfadingRef.current && activeChannelRef.current === channel) {
          handleNext();
        }
      };
    };

    attachEvents(a1, '1');
    attachEvents(a2, '2');

    return () => {
      a1.pause(); a1.src = '';
      a2.pause(); a2.src = '';
      if (crossfadeTimerRef.current) clearInterval(crossfadeTimerRef.current);
    };
  }, [checkCrossfadeTrigger, handleNext, volume]);

  // Windows Media Session Sync
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    if (currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        album: currentSong.album,
        artwork: currentSong.artworkUrl
          ? [
              { src: currentSong.artworkUrl, sizes: '96x96', type: 'image/jpeg' },
              { src: currentSong.artworkUrl, sizes: '256x256', type: 'image/jpeg' },
              { src: currentSong.artworkUrl, sizes: '512x512', type: 'image/jpeg' }
            ]
          : []
      });
    } else {
      navigator.mediaSession.metadata = null;
    }
  }, [currentSong]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return;
    if (duration > 0 && isFinite(duration)) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, duration),
          playbackRate: 1,
          position: Math.max(0, Math.min(currentTime, duration))
        });
      } catch (e) {}
    }
  }, [currentTime, duration]);

  const togglePlayPause = useCallback(() => {
    const active = getActiveAudio();
    if (!active || !currentSongRef.current) return;
    if (active.paused) {
      active.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      active.pause();
      setIsPlaying(false);
    }
  }, [getActiveAudio]);

  const seek = useCallback((timeInSeconds: number) => {
    const active = getActiveAudio();
    if (!active) return;
    const effectiveDur = duration > 0 ? duration : (currentSongRef.current?.duration || 0);
    const clamped = Math.max(0, Math.min(effectiveDur, timeInSeconds));

    active.currentTime = clamped;
    setCurrentTime(clamped);
  }, [duration, getActiveAudio]);

  // Windows Hardware Media Key Listeners
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play', togglePlayPause);
    navigator.mediaSession.setActionHandler('pause', togglePlayPause);
    navigator.mediaSession.setActionHandler('previoustrack', handlePrev);
    navigator.mediaSession.setActionHandler('nexttrack', handleNext);
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined && details.seekTime !== null) seek(details.seekTime);
    });

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('seekto', null);
    };
  }, [togglePlayPause, handlePrev, handleNext, seek]);

  const setVolume = (val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    if (audio1Ref.current) audio1Ref.current.volume = clamped;
    if (audio2Ref.current) audio2Ref.current.volume = clamped;
    setVolumeState(clamped);
    volumeRef.current = clamped;
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
      const insertAt = queueIndexRef.current !== -1 ? queueIndexRef.current + 1 : 0;
      newQueue.splice(insertAt, 0, song);
      return newQueue;
    });
  }, []);

  const addToQueue = useCallback((song: Song) => {
    setQueue((prev) => [...prev, song]);
  }, []);

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
    crossfadeDuration,
    setCrossfadeDuration,
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