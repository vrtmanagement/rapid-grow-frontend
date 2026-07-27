import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../../context/ThemeContext';
import { I18nProvider } from '../../context/I18nContext';
import { CommunicationProvider } from '../../communication/context/CommunicationContext';
import OnboardingTour from '../onboarding/OnboardingTour';

type AppProvidersProps = {
  role: string;
  children: React.ReactNode;
};

const AppProviders: React.FC<AppProvidersProps> = ({ role, children }) => (
  <ThemeProvider>
    <I18nProvider>
      <BrowserRouter>
        <OnboardingTour role={role} />
        <CommunicationProvider>{children}</CommunicationProvider>
      </BrowserRouter>
    </I18nProvider>
  </ThemeProvider>
);

export default AppProviders;
