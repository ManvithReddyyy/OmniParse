import { useState, useEffect } from 'react';
import styles from './typewriter.module.css';

interface TypewriterProps {
  text: string | string[];
  speed?: number;
  delay?: number;
  deleteSpeed?: number;
  waitTime?: number;
  loop?: boolean;
  cursor?: boolean;
  cursorChar?: string;
  className?: string;
  onComplete?: () => void;
}

export default function Typewriter({
  text,
  speed = 40,
  delay = 150,
  deleteSpeed = 25,
  waitTime = 2500,
  loop = false,
  cursor = true,
  cursorChar = '│',
  className = '',
  onComplete,
}: TypewriterProps) {
  const phrases = Array.isArray(text) ? text : [text];
  const [displayText, setDisplayText] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const currentPhrase = phrases[phraseIndex] || '';

    if (isDone) return;

    if (!isDeleting && displayText === currentPhrase) {
      if (phraseIndex === phrases.length - 1 && !loop) {
        setIsDone(true);
        if (onComplete) onComplete();
        return;
      }
      timeout = setTimeout(() => {
        setIsDeleting(true);
      }, waitTime);
    } else if (isDeleting && displayText === '') {
      setIsDeleting(false);
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
    } else {
      const nextChar = isDeleting
        ? currentPhrase.substring(0, displayText.length - 1)
        : currentPhrase.substring(0, displayText.length + 1);

      timeout = setTimeout(
        () => {
          setDisplayText(nextChar);
        },
        displayText === '' && !isDeleting ? delay : isDeleting ? deleteSpeed : speed
      );
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, phraseIndex, phrases, speed, delay, deleteSpeed, waitTime, loop, isDone, onComplete]);

  return (
    <span className={`${styles.typewriter} ${className}`}>
      <span>{displayText}</span>
      {cursor && (
        <span className={`${styles.cursor} ${isDone ? styles.cursorHide : ''}`}>
          {cursorChar}
        </span>
      )}
    </span>
  );
}
