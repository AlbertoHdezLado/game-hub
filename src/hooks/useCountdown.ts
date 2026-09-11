import { useEffect, useRef, useState } from 'react';

export function useCountdown(initialSeconds: number, onExpire: () => void) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          setRunning(false);
          onExpireRef.current();
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [running]);

  return {
    seconds,
    running,
    start: () => setRunning(true),
    stop: () => setRunning(false),
    reset: (value = initialSeconds) => { setRunning(false); setSeconds(value); },
    subtract: (value: number) => setSeconds((current) => Math.max(0, current - value)),
  };
}
