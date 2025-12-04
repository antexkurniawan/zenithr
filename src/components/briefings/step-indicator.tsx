
'use client';

import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  currentStep: number;
}

const steps = [
    { number: 1, title: 'Informasi Dasar' },
    { number: 2, title: 'Materi Briefing' },
    { number: 3, title: 'Peserta' },
];

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <nav aria-label="Progress">
      <ol role="list" className="flex items-center">
        {steps.map((step, stepIdx) => (
          <li key={step.number} className={cn("relative", stepIdx !== steps.length - 1 ? "pr-8 sm:pr-20" : "")}>
            {currentStep > step.number ? (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-primary" />
                </div>
                <div
                  className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary"
                >
                  <span className="text-primary-foreground font-bold">{step.number}</span>
                </div>
                <p className="absolute -bottom-6 text-xs text-center w-full truncate">{step.title}</p>
              </>
            ) : currentStep === step.number ? (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-gray-200" />
                </div>
                <div
                  className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-background"
                  aria-current="step"
                >
                  <span className="font-bold text-primary">{step.number}</span>
                </div>
                 <p className="absolute -bottom-6 text-xs text-center w-full font-semibold truncate">{step.title}</p>
              </>
            ) : (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-gray-200" />
                </div>
                <div
                  className="group relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-background"
                >
                   <span className="font-medium text-muted-foreground">{step.number}</span>
                </div>
                 <p className="absolute -bottom-6 text-xs text-center w-full text-muted-foreground truncate">{step.title}</p>
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
