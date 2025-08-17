export interface OnboardingData {
  step: number;
  adminInfo?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    function: string;
    password: string;
  };
  commune?: {
    id: number;
    name: string;
    population: number;
  };
  subscription?: {
    planId: string;
    planName: string;
    price: number;
  };
  kyc?: {
    method: string;
    documentUploaded?: boolean;
    validated: boolean;
  };
  legal?: {
    cgvAccepted: boolean;
    cguAccepted: boolean;
    responsibilityAccepted: boolean;
  };
}

const STORAGE_KEY = 'onboarding_data';

export const saveOnboardingData = (data: Partial<OnboardingData> | OnboardingData, step?: number): void => {
  try {
    const existingData = getOnboardingData();
    const updatedData = { 
      ...existingData, 
      ...data,
      step: step !== undefined ? step : existingData.step
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
  } catch (error) {
    console.error('Error saving onboarding data:', error);
  }
};

export const getOnboardingData = (): OnboardingData => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : { step: 1 };
  } catch (error) {
    console.error('Error getting onboarding data:', error);
    return { step: 1 };
  }
};

export const clearOnboardingData = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing onboarding data:', error);
  }
};

export const updateOnboardingStep = (step: number): void => {
  saveOnboardingData({ step });
}; 