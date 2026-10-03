import React, { useState, Children } from 'react';
import './Stepper.css';

export default function Stepper({
  children,
  initialStep = 1,
  backButtonText = 'Back',
  nextButtonText = 'Continue',
  ...rest
}) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const stepsArray = Children.toArray(children);
  const totalSteps = stepsArray.length;
  const isCompleted = currentStep > totalSteps;
  const isLastStep = currentStep === totalSteps;

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    setCurrentStep(currentStep + 1);
  };

  return (
    <div className="outer-container" {...rest}>
      <div className="step-circle-container">
        <div className="step-indicator-row">
          {stepsArray.map((_, index) => {
            const stepNumber = index + 1;
            const isNotLastStep = index < totalSteps - 1;
            return (
              <React.Fragment key={stepNumber}>
                <StepIndicator
                  step={stepNumber}
                  currentStep={currentStep}
                />
                {isNotLastStep && <StepConnector isComplete={currentStep > stepNumber} />}
              </React.Fragment>
            );
          })}
        </div>

        {!isCompleted && (
          <div className="step-content-default">
            <div className="step-default">
              {stepsArray[currentStep - 1]}
            </div>
          </div>
        )}

        {!isCompleted && !isLastStep && (
          <div className="footer-container">
            <div className={`footer-nav ${currentStep !== 1 ? 'spread' : 'end'}`}>
              {currentStep !== 1 && (
                <button
                  onClick={handleBack}
                  className="back-button"
                >
                  {backButtonText}
                </button>
              )}
              <button 
                onClick={handleNext} 
                className="next-button"
              >
                {nextButtonText}
              </button>
            </div>
          </div>
        )}

        {!isCompleted && isLastStep && (
          <div className="footer-container">
            <div className="footer-nav spread">
              <button
                onClick={handleBack}
                className="back-button"
              >
                {backButtonText}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function Step({ children }) {
  return <>{children}</>;
}

// REPLACE THIS FUNCTION - Updated StepIndicator
function StepIndicator({ step, currentStep }) {
  const status = currentStep === step ? 'active' : currentStep < step ? 'inactive' : 'complete';

  return (
    <div 
      className={`step-indicator step-indicator-${status}`}
      style={{ cursor: 'default' }}
    >
      <div className={`step-indicator-inner step-indicator-inner-${status}`}>
        {status === 'complete' ? (
          <CheckIcon className="check-icon" />
        ) : status === 'active' ? (
          <div className="active-dot" />
        ) : null /* No number for inactive steps */}
      </div>
    </div>
  );
}

function StepConnector({ isComplete }) {
  return (
    <div className="step-connector">
      <div className={`step-connector-inner ${isComplete ? 'step-connector-complete' : ''}`} />
    </div>
  );
}

function CheckIcon(props) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}