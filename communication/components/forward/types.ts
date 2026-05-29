export type ForwardRecipientOption = {
  id: string;
  recipientId: string;
  title: string;
  subtitle: string;
  avatar?: string;
  kind: 'user' | 'conversation';
  section: 'recent' | 'channels' | 'employees';
  department?: string;
};
