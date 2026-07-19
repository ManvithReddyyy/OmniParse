import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { processingSteps } from '../../data/mock';
import styles from './processing-status.module.css';

interface ProcessingStatusProps {
  onComplete: () => void;
}

export default function ProcessingStatus({ onComplete }: ProcessingStatusProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (currentStep >= processingSteps.length) {
      onComplete();
      return;
    }

    const step = processingSteps[currentStep];
    const timer = setTimeout(() => {
      setCurrentStep((s) => s + 1);
    }, step.duration);

    return () => clearTimeout(timer);
  }, [currentStep, onComplete]);

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Processing Document</h3>
      <div className={styles.steps}>
        {processingSteps.map((step, index) => {
          let state = 'pending';
          if (index < currentStep) state = 'completed';
          else if (index === currentStep) state = 'active';

          const stateClass =
            state === 'completed' ? styles.stepCompleted :
            state === 'active' ? styles.stepActive :
            styles.stepPending;

          return (
            <div key={step.id} className={`${styles.step} ${stateClass}`}>
              <div className={styles.stepIcon}>
                {state === 'completed' ? <Check size={12} strokeWidth={3} /> : null}
              </div>
              <span className={styles.stepLabel}>{step.label}</span>
              {index < processingSteps.length - 1 && <div className={styles.stepLine} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
