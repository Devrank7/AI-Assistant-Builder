interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = { sm: 'h-6 w-6 text-[10px]', md: 'h-8 w-8 text-xs', lg: 'h-10 w-10 text-sm' };

const colors = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-rose-500',
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

export function Avatar({ name, src, size = 'md', className = '' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const color = colors[hashName(name) % colors.length];

  if (src) {
    return <img src={src} alt={name} className={`rounded-full object-cover ${sizeClasses[size]} ${className}`} />;
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full font-medium text-white ${color} ${sizeClasses[size]} ${className}`}
    >
      {initials}
    </div>
  );
}
