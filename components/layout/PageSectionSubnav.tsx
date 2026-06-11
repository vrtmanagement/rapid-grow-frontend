import React from 'react';

interface PageSectionSubnavProps {
  leading?: React.ReactNode;
  center?: React.ReactNode;
  trailing?: React.ReactNode;
  flushWithinContentPadding?: boolean;
  sticky?: boolean;
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
  sticky = true,
  outerClassName = '',
  innerClassName = '',
  leadingClassName = '',
  centerClassName = '',
  trailingClassName = '',
}) => {
  const flushClassName = flushWithinContentPadding ? '-mt-4 sm:-mt-8 lg:-mt-16' : '';
  const positionClassName = sticky ? 'sticky top-0 z-40' : 'relative z-10';

  return (
    <div
      className={`${positionClassName} -mx-4 mb-6 border-b border-slate-200 bg-slate-100 px-3 shadow-[0_1px_0_0_rgba(15,23,42,0.04)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950 dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)] sm:-mx-8 sm:px-5 lg:-mx-16 lg:px-8 ${flushClassName} ${outerClassName}`.trim()}
    >
      <div
        className={`flex w-full flex-col gap-2 py-1.5 md:grid md:min-h-[52px] md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center md:gap-4 ${innerClassName}`.trim()}
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
