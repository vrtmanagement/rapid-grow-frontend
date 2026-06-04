import React from 'react';

type SpacesErrorBannerProps = {
  message: string;
};

const SpacesErrorBanner: React.FC<SpacesErrorBannerProps> = ({ message }) => (
  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[15px] text-red-700">
    {message}
  </div>
);

export default SpacesErrorBanner;
