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

  const setCrossfadeDuration = (seconds: number) => {
    const clamped = Math.max(0, Math.min(12, seconds));
    setCrossfadeDurationState(clamped);
    crossfadeRef.current = clamped;
    localStorage.setItem('myusic_crossfade', clamped.toString());
  };

  const playOnChannel = useCallback((song: Song | any, targetAudio: HTMLAudioElement | null, targetVol: number) => {
    if (!targetAudio) return;

    // Stream directly via HTTPS if external preview track; otherwise use atom://
    const streamUrl = song.isExternal && song.previewUrl
      ? song.previewUrl
      : `atom://track?path=${encodeURIComponent(song.filePath)}`;

    targetAudio.src = streamUrl;
    targetAudio.volume = targetVol;
    targetAudio.currentTime = 0;
    (targetAudio as any)._hasRecordedPlay = false;

    targetAudio
      .play()
      .then(() => setIsPlaying(true))
      .catch((err) => console.error("Playback error:", err));
  }, []);

  const playSong = useCallback(
    (song: Song | any, songList: (Song | any)[] = []) => {
      if (crossfadeTimerRef.current) {
        clearInterval(crossfadeTimerRef.current);
        crossfadeTimerRef.current = null;
      }
      isCrossfadingRef.current = false;

      const activeQueue = songList.length > 0 ? songList : [song];
      const index = activeQueue.findIndex((s) => (s.filePath && s.filePath === song.filePath) || s.id === song.id);

      setQueue(activeQueue);
      setQueueIndex(index !== -1 ? index : 0);
      setCurrentSong(song);

      const initialDuration = song.duration > 0 ? song.duration : 0;
      setDuration(initialDuration);
      setCurrentTime(0);

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

    playOnChannel(nextSong, incomingAudio, 0);

    setQueueIndex(nextIdx);
    setCurrentSong(nextSong);

    const steps = 30;
    const stepInterval = (xfadeSec * 1000) / steps;
    let stepCount = 0;

    crossfadeTimerRef.current = setInterval(() => {
      stepCount++;
      const progress = stepCount / steps;

      if (outgoingAudio) {
        outgoingAudio.volume = Math.max(0, masterVol * (1 - progress));
      }
      if (incomingAudio) {
        incomingAudio.volume = Math.min(masterVol, masterVol * progress);
      }

      if (stepCount >= steps) {
        if (crossfadeTimerRef.current) clearInterval(crossfadeTimerRef.current);
        crossfadeTimerRef.current = null;

        if (outgoingAudio) {
          outgoingAudio.pause();
          outgoingAudio.src = '';
          outgoingAudio.volume = masterVol;
        }

        activeChannelRef.current = activeChannelRef.current === '1' ? '2' : '1';
        isCrossfadingRef.current = false;
      }
    }, stepInterval);
  }, [getActiveAudio, getInactiveAudio, getNextTrackIndex, playOnChannel]);

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
 // Initialize both channels once on mount (Removed `volume` from dependency array)
  useEffect(() => {
    const a1 = new Audio();
    const a2 = new Audio();
    a1.volume = volumeRef.current;
    a2.volume = volumeRef.current;

    audio1Ref.current = a1;
    audio2Ref.current = a2;

    const attachEvents = (audio: HTMLAudioElement, channel: '1' | '2') => {
      audio.ontimeupdate = () => {
        if (activeChannelRef.current === channel && !isCrossfadingRef.current) {
          setCurrentTime(audio.currentTime);
          checkCrossfadeTrigger(audio);

          if (audio.currentTime >= 15 && currentSongRef.current && !(audio as any)._hasRecordedPlay) {
            (audio as any)._hasRecordedPlay = true;
            window.electronAPI?.recordPlay?.(currentSongRef.current);
          }
        } else if (isCrossfadingRef.current && activeChannelRef.current !== channel) {
          setCurrentTime(audio.currentTime);
        }
      };

      audio.onloadedmetadata = () => {
        if (activeChannelRef.current === channel && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          setDuration(audio.duration);
        }
      };

      audio.onended = () => {
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
  }, [checkCrossfadeTrigger, handleNext]); // <-- Cleaned: no more `volume` dependency
  // Windows Media Session Sync
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    if (currentSong) {
      const art = currentSong.artworkUrl;
      const isAllowedScheme = Boolean(
        art &&
        (art.startsWith('http://') ||
         art.startsWith('https://') ||
         art.startsWith('data:') ||
         art.startsWith('blob:'))
      );

      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        album: currentSong.album,
        artwork: isAllowedScheme && art
          ? [
              { src: art, sizes: '96x96', type: 'image/jpeg' },
              { src: art, sizes: '256x256', type: 'image/jpeg' },
              { src: art, sizes: '512x512', type: 'image/jpeg' }
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

export default useAudioPlayer;