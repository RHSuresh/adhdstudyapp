import { useEffect, useRef } from 'react';

export function DancingOwl() {
  const owlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Random position on mount
    if (owlRef.current) {
      const randomRight = 20 + Math.random() * 30;
      owlRef.current.style.right = `${randomRight}px`;
    }
  }, []);

  return (
    <div
      ref={owlRef}
      className="fixed bottom-4 z-50 cursor-pointer select-none"
      style={{ right: '30px' }}
    >
      <div className="relative animate-bounce-slow">
        {/* Speech bubble */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-card px-3 py-2 rounded-xl shadow-soft border border-border/50 whitespace-nowrap text-sm font-medium animate-fade-in">
          <span>You've got this! 🎉</span>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-card border-r border-b border-border/50 rotate-45" />
        </div>

        {/* Owl SVG */}
        <svg
          width="80"
          height="100"
          viewBox="0 0 80 100"
          className="owl-dance drop-shadow-lg"
        >
          {/* Body */}
          <ellipse cx="40" cy="60" rx="30" ry="35" fill="hsl(var(--primary))" />
          
          {/* Belly */}
          <ellipse cx="40" cy="70" rx="20" ry="22" fill="hsl(var(--accent))" />
          
          {/* Left ear tuft */}
          <path d="M15 30 L22 45 L28 35 Z" fill="hsl(var(--primary))" />
          
          {/* Right ear tuft */}
          <path d="M65 30 L52 45 L58 35 Z" fill="hsl(var(--primary))" />
          
          {/* Left eye white */}
          <circle cx="28" cy="50" r="12" fill="white" />
          
          {/* Right eye white */}
          <circle cx="52" cy="50" r="12" fill="white" />
          
          {/* Left pupil - animated */}
          <circle cx="30" cy="50" r="6" fill="#333" className="owl-pupil-left" />
          
          {/* Right pupil - animated */}
          <circle cx="54" cy="50" r="6" fill="#333" className="owl-pupil-right" />
          
          {/* Left eye shine */}
          <circle cx="32" cy="48" r="2" fill="white" />
          
          {/* Right eye shine */}
          <circle cx="56" cy="48" r="2" fill="white" />
          
          {/* Beak */}
          <path d="M36 58 L40 68 L44 58 Z" fill="hsl(var(--warning))" />
          
          {/* Left wing */}
          <ellipse cx="12" cy="65" rx="10" ry="18" fill="hsl(var(--primary))" className="owl-wing-left" />
          
          {/* Right wing */}
          <ellipse cx="68" cy="65" rx="10" ry="18" fill="hsl(var(--primary))" className="owl-wing-right" />
          
          {/* Left foot */}
          <ellipse cx="30" cy="92" rx="8" ry="4" fill="hsl(var(--warning))" />
          
          {/* Right foot */}
          <ellipse cx="50" cy="92" rx="8" ry="4" fill="hsl(var(--warning))" />
          
          {/* Graduation cap */}
          <rect x="20" y="22" width="40" height="5" fill="#333" />
          <polygon points="40,10 20,25 60,25" fill="#333" />
          <circle cx="40" cy="25" r="3" fill="hsl(var(--warning))" />
          <path d="M40 25 Q45 30 48 40" stroke="hsl(var(--warning))" strokeWidth="2" fill="none" />
        </svg>
      </div>

      <style>{`
        @keyframes owl-dance {
          0%, 100% { transform: rotate(-3deg) translateY(0); }
          25% { transform: rotate(3deg) translateY(-5px); }
          50% { transform: rotate(-3deg) translateY(0); }
          75% { transform: rotate(3deg) translateY(-5px); }
        }

        @keyframes wing-flap-left {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-20deg); }
        }

        @keyframes wing-flap-right {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(20deg); }
        }

        @keyframes pupil-look {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }

        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .owl-dance {
          animation: owl-dance 1s ease-in-out infinite;
          transform-origin: center bottom;
        }

        .owl-wing-left {
          animation: wing-flap-left 0.5s ease-in-out infinite;
          transform-origin: right center;
        }

        .owl-wing-right {
          animation: wing-flap-right 0.5s ease-in-out infinite;
          transform-origin: left center;
        }

        .owl-pupil-left, .owl-pupil-right {
          animation: pupil-look 2s ease-in-out infinite;
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
