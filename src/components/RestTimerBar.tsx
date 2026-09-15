import React, { useEffect, useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { Haptics } from '@capacitor/haptics';

interface RestTimerProps {
  initialSeconds?: number;
  isOpen: boolean;
  onClose: () => void;
}

export const RestTimerBar: React.FC<RestTimerProps> = ({
  initialSeconds = 90,
  isOpen,
  onClose,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setSecondsLeft(initialSeconds);
      setIsRunning(true);
    }
  }, [isOpen, initialSeconds]);

  useEffect(() => {
    if (!isOpen || !isRunning) return;

    if (secondsLeft <= 0) {
      // Trigger Capacitor Native Haptics vibration pulse
      Haptics.vibrate({ duration: 500 }).catch(() => {
        if (typeof window !== 'undefined' && window.navigator?.vibrate) {
          window.navigator.vibrate([200, 100, 200]);
        }
      });
      onClose();
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isRunning, secondsLeft, onClose]);

  if (!isOpen) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const add30Seconds = () => {
    setSecondsLeft((prev) => prev + 30);
  };

  const minus15Seconds = () => {
    setSecondsLeft((prev) => Math.max(0, prev - 15));
  };

  return (
    <div className="rest-timer-bar">
      <div>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Rest Timer
        </div>
        <div className="timer-countdown">{formatted}</div>
      </div>

      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <button
          onClick={minus15Seconds}
          className="btn btn-secondary"
          id="btn-timer-minus-15"
          style={{ height: '44px', minHeight: '44px', padding: '0 10px', fontSize: '0.82rem', gap: '4px' }}
          title="Subtract 15 seconds"
        >
          <Minus size={15} /> 15s
        </button>

        <button
          onClick={add30Seconds}
          className="btn btn-secondary"
          id="btn-timer-plus-30"
          style={{ height: '44px', minHeight: '44px', padding: '0 10px', fontSize: '0.82rem', gap: '4px' }}
          title="Add 30 seconds"
        >
          <Plus size={15} /> 30s
        </button>

        <button
          onClick={onClose}
          className="btn btn-secondary"
          id="btn-timer-close"
          style={{ height: '44px', minHeight: '44px', padding: '0 10px', fontSize: '0.85rem', color: 'var(--accent-rose)' }}
          title="Skip rest"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};
