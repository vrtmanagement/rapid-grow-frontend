import { useContext } from 'react';
import { CommunicationContext } from './CommunicationContextCore';

export function useCommunication() {
  const ctx = useContext(CommunicationContext);
  if (!ctx) throw new Error('useCommunication must be used within CommunicationProvider');
  return ctx;
}
