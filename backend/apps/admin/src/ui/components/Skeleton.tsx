import { HTMLAttributes } from 'react';
import './Skeleton.css';

export function Skeleton({ width, height, className, ...rest }: HTMLAttributes<HTMLDivElement> & { width?: number | string; height?: number | string }) {
  const style = { width: typeof width === 'number' ? `${width}px` : width, height: typeof height === 'number' ? `${height}px` : height };
  return <div className={`skel ${className ?? ''}`} style={style} {...rest} />;
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skel skel-line" style={{ width: i === lines - 1 ? '60%' : '100%' }} />
      ))}
    </div>
  );
}
