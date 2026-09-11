import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

interface MainButtonProps extends PropsWithChildren, ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

export function MainButton({ children, className = '', ...props }: Readonly<MainButtonProps>) {
  return <button className={`btn-main ${className}`.trim()} {...props}>{children}</button>;
}