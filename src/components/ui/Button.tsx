import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'default' | 'sm' | 'lg'
  children: React.ReactNode
}

export function Button({ 
  className, 
  variant = 'default', 
  size = 'default', 
  children, 
  ...props 
}: ButtonProps) {
  const variants = {
    default: 'bg-primary text-white hover:bg-primary-dark',
    ghost: 'hover:bg-gray-100 text-gray-700',
    outline: 'border-2 border-primary text-primary hover:bg-primary hover:text-white',
  }
  
  const sizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-8 px-3 py-1 text-sm',
    lg: 'h-12 px-6 py-3 text-lg',
  }

  return (
    <button
      className={cn(
        'rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
