import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';

interface AudioPlayerProps {
  audioUrl: string;
}

export const AudioPlayer = ({ audioUrl }: AudioPlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create new abort controller for this effect
    abortControllerRef.current = new AbortController();

    // Initialize WaveSurfer
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#84cc1640',
      progressColor: '#84cc16',
      cursorColor: '#84cc16',
      barWidth: 2,
      barGap: 3,
      height: 60,
      barRadius: 3,
      normalize: true,
      backend: 'WebAudio',
    });

    // Load audio
    try {
      wavesurfer.load(audioUrl, undefined, undefined, abortControllerRef.current.signal);
    } catch (error) {
      // Ignore AbortError as it's expected when component unmounts
      if (error.name !== 'AbortError') console.error('Error loading audio:', error);
    }

    // Event handlers
    wavesurfer.on('ready', () => {
      wavesurferRef.current = wavesurfer;
      setDuration(wavesurfer.getDuration());
    });

    wavesurfer.on('audioprocess', () => {
      setCurrentTime(wavesurfer.getCurrentTime());
    });

    wavesurfer.on('finish', () => {
      setIsPlaying(false);
    });

    return () => {
      wavesurfer.destroy();
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, [audioUrl]);

  const togglePlayPause = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setMuted(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-dark-100 rounded-xl p-4 space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <motion.button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            togglePlayPause();
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5" />
          )}
        </motion.button>

        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-400 font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <motion.button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleMute();
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-8 h-8 rounded-full bg-dark-200 flex items-center justify-center text-gray-400 hover:text-primary transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </motion.button>
        </div>
      </div>

      {/* Waveform */}
      <div ref={containerRef} className="w-full" />
    </div>
  );
};