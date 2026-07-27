import React from 'react';
import ClientPortalView from '../../views/ClientPortalView';
import LoginView from '../../views/LoginView';
import LandingPageView from '../../views/LandingPageView';
import InviteAcceptView from '../../views/InviteAcceptView';
import WorkspaceSignupView from '../../views/WorkspaceSignupView';
import ForgotPasswordView from '../../views/ForgotPasswordView';
import ResetPasswordView from '../../views/ResetPasswordView';
import { isInviteAcceptPath } from './appShellHelpers';

type AppPublicRouterProps = {
  isAuthenticated: boolean | null;
  publicPath: string;
  onLoginSuccess: () => void;
};

const AppPublicRouter: React.FC<AppPublicRouterProps> = ({
  isAuthenticated,
  publicPath,
  onLoginSuccess,
}) => {
  if (isAuthenticated === null) {
    return null;
  }

  if (isInviteAcceptPath(publicPath)) {
    return <InviteAcceptView onAcceptSuccess={onLoginSuccess} />;
  }

  if (!isAuthenticated) {
    if (publicPath === 'signup' || publicPath.startsWith('signup') || publicPath === 'workspaces/signup') {
      return <WorkspaceSignupView onSignupSuccess={onLoginSuccess} />;
    }
    if (publicPath === 'login') {
      return <LoginView onLoginSuccess={onLoginSuccess} />;
    }
    if (publicPath === 'password/forgot' || publicPath === 'password/reset') {
      if (publicPath === 'password/reset') {
        return <ResetPasswordView onResetSuccess={onLoginSuccess} />;
      }
      return <ForgotPasswordView />;
    }
    if (publicPath.startsWith('client-portal/')) {
      return <ClientPortalView />;
    }
    if (publicPath === '' || publicPath === 'home' || publicPath === 'landing') {
      return <LandingPageView />;
    }
    return <LoginView onLoginSuccess={onLoginSuccess} />;
  }

  return null;
};

export default AppPublicRouter;
