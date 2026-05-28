import React from 'react';

interface PageSectionSubnavProps {
  leading?: React.ReactNode;
  center?: React.ReactNode;
  trailing?: React.ReactNode;
  flushWithinContentPadding?: boolean;
  outerClassName?: string;
  innerClassName?: string;
  leadingClassName?: string;
  centerClassName?: string;
  trailingClassName?: string;
}

const PageSectionSubnav: React.FC<PageSectionSubnavProps> = ({
  leading,
  center,
  trailing,
  flushWithinContentPadding = false,
  outerClassName = '',
  innerClassName = '',
  leadingClassName = '',
  centerClassName = '',
  trailingClassName = '',
}) => {
  const flushClassName = flushWithinContentPadding ? '-mt-4 sm:-mt-8 lg:-mt-16' : '';

  return (
    <div
      className={`sticky top-[-1px] z-30 -mx-4 mb-6 border-b border-slate-200 bg-slate-100/95 px-3 backdrop-blur-xl sm:-mx-8 sm:px-5 lg:-mx-16 lg:px-8 ${flushClassName} ${outerClassName}`.trim()}
    >
      <div
        className={`flex w-full flex-col gap-2 py-1.5 lg:grid lg:min-h-[52px] lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-4 ${innerClassName}`.trim()}
      >
        <div className={`flex min-w-0 items-center gap-2 lg:justify-self-start ${leadingClassName}`.trim()}>
          {leading}
        </div>
        <div className={`flex items-center justify-center gap-5 overflow-x-auto lg:justify-self-center ${centerClassName}`.trim()}>
          {center}
        </div>
        <div className={`flex min-h-[38px] flex-wrap items-center justify-start gap-2 lg:justify-end lg:justify-self-end ${trailingClassName}`.trim()}>
          {trailing}
        </div>
      </div>
    </div>
  );
};

export default PageSectionSubnav;
