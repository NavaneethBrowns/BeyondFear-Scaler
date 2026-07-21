import { forwardRef } from 'react';

export const Input = forwardRef(({ type = 'text', className = '', ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={`input-field ${className}`}
    {...props}
  />
));

Input.displayName = 'Input';
