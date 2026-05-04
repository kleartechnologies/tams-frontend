'use client';

import React, { InputHTMLAttributes, forwardRef } from 'react';

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, leftIcon, rightElement, className = '', style, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && <label className="text-[13.5px] font-semibold text-gray-700">{label}</label>}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            style={style}
            className={[
              'w-full rounded-xl border border-gray-200 bg-white py-2.5 text-[14px] text-gray-900',
              'placeholder:text-gray-400 outline-none transition',
              'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
              leftIcon ? 'pl-10' : 'pl-4',
              rightElement ? 'pr-10' : 'pr-4',
              className,
            ].join(' ')}
            {...props}
          />
          {rightElement && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</span>
          )}
        </div>
      </div>
    );
  }
);

InputField.displayName = 'InputField';
