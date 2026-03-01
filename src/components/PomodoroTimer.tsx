import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

type TimerPhase = 'focus' | 'short-break' | 'long-break';

interface TimerSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
}

const DEFAULT_SETTINGS: TimerSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
};

const phaseLabels: Record<TimerPhase, string> = {
  'focus': '🎯 Focus Time',
  'short-break': '☕ Short Break',
  'long-break': '🌟 Long Break',
};

interface PomodoroTimerProps {
  externalSettings?: Partial<TimerSettings> | null;
}

export function PomodoroTimer({ externalSettings }: PomodoroTimerProps = {}) {
  const [settings, setSettings] = useState<TimerSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [phase, setPhase] = useState<TimerPhase>('focus');
  const [secondsLeft, setSecondsLeft] = useState(settings.focusMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Handle external settings from chatbot
  useEffect(() => {
    if (externalSettings) {
      const newSettings = { ...settings, ...externalSettings };
      setSettings(newSettings);
      setIsRunning(false);
      setPhase('focus');
      setSecondsLeft(newSettings.focusMinutes * 60);
    }
  }, [externalSettings]);

  const totalSeconds = phase === 'focus'
    ? settings.focusMinutes * 60
    : phase === 'short-break'
    ? settings.shortBreakMinutes * 60
    : settings.longBreakMinutes * 60;

  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handlePhaseComplete = useCallback(() => {
    setIsRunning(false);
    if (phase === 'focus') {
      const newCompleted = completedSessions + 1;
      setCompletedSessions(newCompleted);
      if (newCompleted % settings.sessionsBeforeLongBreak === 0) {
        setPhase('long-break');
        setSecondsLeft(settings.longBreakMinutes * 60);
      } else {
        setPhase('short-break');
        setSecondsLeft(settings.shortBreakMinutes * 60);
      }
    } else {
      setPhase('focus');
      setSecondsLeft(settings.focusMinutes * 60);
    }
  }, [phase, completedSessions, settings]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            handlePhaseComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, handlePhaseComplete]);

  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    setPhase('focus');
    setSecondsLeft(settings.focusMinutes * 60);
    setCompletedSessions(0);
  };

  const applySettings = (newSettings: TimerSettings) => {
    setSettings(newSettings);
    setShowSettings(false);
    setIsRunning(false);
    setPhase('focus');
    setSecondsLeft(newSettings.focusMinutes * 60);
  };

  const phaseColor = phase === 'focus' ? 'text-primary' : phase === 'short-break' ? 'text-success' : 'text-warning';
  const progressColor = phase === 'focus' ? 'stroke-primary' : phase === 'short-break' ? 'stroke-success' : 'stroke-warning';

  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="bg-card rounded-2xl shadow-soft border border-border/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg">⏱️ Pomodoro Timer</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSettings(!showSettings)}
          className="h-8 w-8"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {showSettings ? (
        <SettingsPanel settings={settings} onApply={applySettings} onCancel={() => setShowSettings(false)} />
      ) : (
        <>
          {/* Phase label */}
          <p className={cn('text-center text-sm font-semibold mb-3', phaseColor)}>
            {phaseLabels[phase]}
          </p>

          {/* Circular timer */}
          <div className="flex justify-center mb-4">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" className="stroke-secondary" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="54" fill="none"
                  className={cn(progressColor, 'transition-all duration-1000')}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold tabular-nums">{formatTime(secondsLeft)}</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <Button variant="outline" size="icon" onClick={resetTimer} className="rounded-full h-10 w-10">
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              onClick={toggleTimer}
              className="rounded-full h-12 w-12"
              size="icon"
            >
              {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </Button>
          </div>

          {/* Session dots */}
          <div className="flex items-center justify-center gap-1.5">
            {Array.from({ length: settings.sessionsBeforeLongBreak }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-3 h-3 rounded-full transition-all',
                  i < completedSessions ? 'bg-primary scale-110' : 'bg-secondary'
                )}
              />
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            {completedSessions} / {settings.sessionsBeforeLongBreak} sessions
          </p>
        </>
      )}
    </div>
  );
}

function SettingsPanel({
  settings,
  onApply,
  onCancel,
}: {
  settings: TimerSettings;
  onApply: (s: TimerSettings) => void;
  onCancel: () => void;
}) {
  const [local, setLocal] = useState(settings);

  const sliders: { label: string; key: keyof TimerSettings; min: number; max: number; unit: string }[] = [
    { label: 'Focus', key: 'focusMinutes', min: 5, max: 60, unit: 'min' },
    { label: 'Short Break', key: 'shortBreakMinutes', min: 1, max: 15, unit: 'min' },
    { label: 'Long Break', key: 'longBreakMinutes', min: 5, max: 30, unit: 'min' },
    { label: 'Sessions', key: 'sessionsBeforeLongBreak', min: 2, max: 8, unit: '' },
  ];

  return (
    <div className="space-y-4">
      {sliders.map(({ label, key, min, max, unit }) => (
        <div key={key}>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{local[key]}{unit && ` ${unit}`}</span>
          </div>
          <Slider
            min={min}
            max={max}
            step={1}
            value={[local[key]]}
            onValueChange={([v]) => setLocal(prev => ({ ...prev, [key]: v }))}
          />
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" className="flex-1" onClick={() => onApply(local)}>
          <Check className="w-4 h-4 mr-1" /> Apply
        </Button>
      </div>
    </div>
  );
}
