export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return <img src="/logo-icon.png" alt="" className={`${className} object-contain`} aria-hidden="true" />;
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark />
      <span className="font-display text-lg font-bold tracking-tight text-lily-blue-800">
        Lily<span className="text-lily-pink-600">Medical</span>
      </span>
    </div>
  );
}
