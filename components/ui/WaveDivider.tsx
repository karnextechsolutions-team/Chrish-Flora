// components/ui/WaveDivider.tsx

interface WaveDividerProps {
  color?: string;
  flip?: boolean;
}

export default function WaveDivider({ 
  color = '#FBF7EE', 
  flip = false 
}: WaveDividerProps) {
  return (
    <div className={flip ? 'rotate-180' : ''}>
      <svg viewBox="0 0 1440 60" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto block">
        <path
          d="M0,30 C240,60 480,0 720,30 C960,60 1200,0 1440,30 L1440,60 L0,60 Z"
          fill={color}
        />
      </svg>
    </div>
  );
}
