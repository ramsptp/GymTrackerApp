import React, { useEffect, useState } from 'react';
import { X, Plus } from 'lucide-react';

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
      if (window.navigator?.vibrate) {
        window.navigator.vibrate([100, 50, 100]);
      }
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

  return (
    <div className="rest-timer-bar">
      <div>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Rest Timer
        </div>
        <div className="timer-countdown">{formatted}</div>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={add30Seconds}
          className="btn btn-secondary"
          style={{ height: '44px', minHeight: '44px', padding: '0 12px', fontSize: '0.85rem' }}
          title="Add 30 seconds"
        >
          <Plus size={16} /> 30s
        </button>

        <button
          onClick={onClose}
          className="btn btn-secondary"
          style={{ height: '44px', minHeight: '44px', padding: '0 12px', fontSize: '0.85rem', color: 'var(--accent-rose)' }}
          title="Skip rest"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};
