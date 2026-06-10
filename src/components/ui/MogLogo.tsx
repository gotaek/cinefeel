import React from 'react';

interface MogLogoProps {
  className?: string;
}

export const MogLogo: React.FC<MogLogoProps> = ({ className = 'w-8 h-8' }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src="/mog-logo-final.svg" alt="MOG Logo" className={`object-contain ${className}`} />
);
