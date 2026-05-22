'use client';

import React, {
  useState,
  Children,
  useRef,
  useLayoutEffect,
  ReactNode,
  HTMLAttributes,
  ButtonHTMLAttributes,
} from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

interface StepperProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  children: ReactNode;
  initialStep?: number;
  onStepChange?: (step: number) => void;
  onFinalStepCompleted?: () => void;
  stepCircleContainerClassName?: string;
  stepContainerClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
  backButtonProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  nextButtonProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  backButtonText?: string;
  nextButtonText?: string;
  completeButtonText?: string;
  disableStepIndicators?: boolean;
  canGoNext?: boolean;
  renderStepIndicator?: (props: {
    step: number;
    currentStep: number;
    onStepClick: (step: number) => void;
  }) => ReactNode;
}

export default function Stepper({
  children,
  initialStep = 1,
  onStepChange = () => {},
  onFinalStepCompleted = () => {},
  stepCircleContainerClassName = '',
  stepContainerClassName = '',
  contentClassName = '',
  footerClassName = '',
  backButtonProps = {},
  nextButtonProps = {},
  backButtonText = '上一步',
  nextButtonText = '下一步',
  completeButtonText = '开始画画',
  disableStepIndicators = false,
  canGoNext = true,
  renderStepIndicator,
  ...rest
}: StepperProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [direction, setDirection] = useState(0);
  const stepsArray = Children.toArray(children);
  const totalSteps = stepsArray.length;
  const isCompleted = currentStep > totalSteps;
  const isLastStep = currentStep === totalSteps;

  const updateStep = (newStep: number) => {
    setCurrentStep(newStep);
    if (newStep > totalSteps) onFinalStepCompleted();
    else onStepChange(newStep);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection(-1);
      updateStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (!canGoNext) return;
    if (!isLastStep) {
      setDirection(1);
      updateStep(currentStep + 1);
    }
  };

  const handleComplete = () => {
    if (!canGoNext) return;
    setDirection(1);
    updateStep(totalSteps + 1);
  };

  return (
    <div className="flex w-full flex-col items-center justify-center" {...rest}>
      <div
        className={`mx-auto w-full max-w-md bg-white ${stepCircleContainerClassName}`}
        style={{
          border: '2px solid #1A1A1A',
          borderRadius: '1.5rem',
          boxShadow: '4px 4px 0 #1A1A1A',
        }}
      >
        {/* Indicator row */}
        <div className={`${stepContainerClassName} flex w-full items-center px-6 pt-6 pb-2`}>
          {stepsArray.map((_, index) => {
            const stepNumber = index + 1;
            const isNotLastStep = index < totalSteps - 1;
            return (
              <React.Fragment key={stepNumber}>
                {renderStepIndicator ? (
                  renderStepIndicator({
                    step: stepNumber,
                    currentStep,
                    onStepClick: clicked => {
                      setDirection(clicked > currentStep ? 1 : -1);
                      updateStep(clicked);
                    },
                  })
                ) : (
                  <StepIndicator
                    step={stepNumber}
                    disableStepIndicators={disableStepIndicators}
                    currentStep={currentStep}
                    onClickStep={clicked => {
                      setDirection(clicked > currentStep ? 1 : -1);
                      updateStep(clicked);
                    }}
                  />
                )}
                {isNotLastStep && <StepConnector isComplete={currentStep > stepNumber} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Animated step content */}
        <StepContentWrapper
          isCompleted={isCompleted}
          currentStep={currentStep}
          direction={direction}
          className={`px-6 ${contentClassName}`}
        >
          {stepsArray[currentStep - 1]}
        </StepContentWrapper>

        {/* Footer with nav buttons */}
        {!isCompleted && (
          <div className={`px-6 pb-6 pt-2 ${footerClassName}`}>
            <div className={`mt-6 flex ${currentStep !== 1 ? 'justify-between' : 'justify-end'} items-center gap-3`}>
              {currentStep !== 1 && (
                <button
                  onClick={handleBack}
                  className="rounded-full transition-all"
                  style={{
                    border: '2px solid #1A1A1A',
                    background: '#FFFFFF',
                    color: '#1A1A1A',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    padding: '0.55em 1.4em',
                    letterSpacing: '-0.01em',
                  }}
                  {...backButtonProps}
                >
                  ← {backButtonText}
                </button>
              )}
              <button
                onClick={isLastStep ? handleComplete : handleNext}
                disabled={!canGoNext}
                className="rounded-full transition-all"
                style={{
                  border: '2px solid #1A1A1A',
                  background: !canGoNext ? '#E5E5E5' : isLastStep ? '#7A51EC' : '#1A1A1A',
                  color: !canGoNext ? '#999' : '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  padding: '0.6em 1.6em',
                  letterSpacing: '-0.01em',
                  boxShadow: !canGoNext ? 'none' : '3px 3px 0 #1A1A1A',
                  cursor: !canGoNext ? 'not-allowed' : 'pointer',
                  opacity: !canGoNext ? 0.6 : 1,
                }}
                {...nextButtonProps}
              >
                {isLastStep ? completeButtonText : nextButtonText} →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepContentWrapper({
  isCompleted,
  currentStep,
  direction,
  children,
  className,
}: {
  isCompleted: boolean;
  currentStep: number;
  direction: number;
  children: ReactNode;
  className?: string;
}) {
  const [parentHeight, setParentHeight] = useState(0);

  return (
    <motion.div
      style={{ position: 'relative', overflow: 'hidden' }}
      animate={{ height: isCompleted ? 0 : parentHeight }}
      transition={{ type: 'spring', duration: 0.4 }}
      className={className}
    >
      <AnimatePresence initial={false} mode="sync" custom={direction}>
        {!isCompleted && (
          <SlideTransition
            key={currentStep}
            direction={direction}
            onHeightReady={h => setParentHeight(h)}
          >
            {children}
          </SlideTransition>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SlideTransition({
  children,
  direction,
  onHeightReady,
}: {
  children: ReactNode;
  direction: number;
  onHeightReady: (h: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (containerRef.current) onHeightReady(containerRef.current.offsetHeight);
  }, [children, onHeightReady]);

  return (
    <motion.div
      ref={containerRef}
      custom={direction}
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.4 }}
      style={{ position: 'absolute', left: 0, right: 0, top: 0 }}
    >
      {children}
    </motion.div>
  );
}

const stepVariants: Variants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? '-100%' : '100%',
    opacity: 0,
  }),
  center: {
    x: '0%',
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir >= 0 ? '50%' : '-50%',
    opacity: 0,
  }),
};

export function Step({ children }: { children: ReactNode }) {
  return <div className="py-4">{children}</div>;
}

function StepIndicator({
  step,
  currentStep,
  onClickStep,
  disableStepIndicators,
}: {
  step: number;
  currentStep: number;
  onClickStep: (step: number) => void;
  disableStepIndicators?: boolean;
}) {
  const status =
    currentStep === step ? 'active' : currentStep < step ? 'inactive' : 'complete';

  const handleClick = () => {
    if (step !== currentStep && !disableStepIndicators) onClickStep(step);
  };

  return (
    <motion.div
      onClick={handleClick}
      className={`relative outline-none focus:outline-none ${
        disableStepIndicators ? 'pointer-events-none opacity-50' : 'cursor-pointer'
      }`}
      animate={status}
      initial={false}
    >
      <motion.div
        variants={{
          inactive: { scale: 1, backgroundColor: '#FFFFFF' },
          active: { scale: 1.1, backgroundColor: '#7A51EC' },
          complete: { scale: 1, backgroundColor: '#7DC353' },
        }}
        transition={{ duration: 0.3 }}
        className="flex h-9 w-9 items-center justify-center rounded-full"
        style={{
          border: '2px solid #1A1A1A',
          boxShadow: status === 'active' ? '2px 2px 0 #1A1A1A' : 'none',
        }}
      >
        {status === 'complete' ? (
          <CheckIcon className="h-4 w-4" style={{ color: '#FFFFFF' }} />
        ) : status === 'active' ? (
          <span style={{ color: '#FFFFFF', fontWeight: 900, fontSize: '0.9rem' }}>{step}</span>
        ) : (
          <span style={{ color: '#1A1A1A', fontWeight: 800, fontSize: '0.9rem' }}>{step}</span>
        )}
      </motion.div>
    </motion.div>
  );
}

function StepConnector({ isComplete }: { isComplete: boolean }) {
  const lineVariants: Variants = {
    incomplete: { width: 0, backgroundColor: '#7DC353' },
    complete: { width: '100%', backgroundColor: '#7DC353' },
  };

  return (
    <div
      className="relative mx-2 flex-1 overflow-hidden"
      style={{ height: '3px', background: '#1A1A1A', borderRadius: '2px' }}
    >
      <motion.div
        className="absolute left-0 top-0 h-full"
        variants={lineVariants}
        initial={false}
        animate={isComplete ? 'complete' : 'incomplete'}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.1, type: 'tween', ease: 'easeOut', duration: 0.3 }}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
