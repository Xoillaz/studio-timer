'use client';

import React from 'react';

export type IconName = 
  | 'check' | 'x' | 'alert-circle' | 'info' 
  | 'chevron-right' | 'user' | 'camera' | 'phone' 
  | 'log-out' | 'message-circle' | 'wallet' 
  | 'arrow-up' | 'arrow-down' | 'list' | 'home';

export type IconProps = {
  name: IconName;
  size?: number;
  className?: string;
}

export default function Icon({ name, size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
    >
      <use href={`/icons.svg#icon-${name}`} />
    </svg>
  );
}
