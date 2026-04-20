import React, { useEffect, useRef } from 'react';

export const CursorGlow = () => {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!glowRef.current) return;
      
      const { clientX, clientY } = e;
      glowRef.current.style.setProperty('--mouse-x', `${clientX}px`);
      glowRef.current.style.setProperty('--mouse-y', `${clientY}px`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return <div ref={glowRef} className="cursor-glow" />;
};