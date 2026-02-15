import { Trophy, Flame, Star, Target, Award } from 'lucide-react';

interface StudentStats {
  points: number;
  streak_days: number;
  tasks_completed: number;
  last_completed_date: string | null;
}

interface GamificationPanelProps {
  stats: StudentStats | null;
}

export function GamificationPanel({ stats }: GamificationPanelProps) {
  const points = stats?.points || 0;
  const streak = stats?.streak_days || 0;
  const completed = stats?.tasks_completed || 0;

  // Calculate level based on points
  const level = Math.floor(points / 100) + 1;
  const pointsToNextLevel = 100 - (points % 100);

  const badges = [
    { name: 'First Steps', icon: '🌟', earned: completed >= 1, description: 'Complete your first task' },
    { name: 'Task Master', icon: '🏆', earned: completed >= 10, description: 'Complete 10 tasks' },
    { name: 'Super Student', icon: '🎓', earned: completed >= 25, description: 'Complete 25 tasks' },
    { name: 'Practice Champion', icon: '🔥', earned: streak >= 7, description: '7-day streak' },
    { name: 'Focus Legend', icon: '👑', earned: points >= 1000, description: 'Reach 1000 points' },
  ];

  const earnedBadges = badges.filter(b => b.earned);
  const nextBadge = badges.find(b => !b.earned);

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="bg-card rounded-2xl shadow-soft border border-border/50 p-4">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          My Progress
        </h3>

        {/* Level */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Level {level}</span>
            <span className="text-xs text-muted-foreground">{pointsToNextLevel} pts to next</span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
              style={{ width: `${(points % 100)}%` }}
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-accent/50 rounded-xl">
            <Star className="w-5 h-5 text-primary mx-auto mb-1" />
            <div className="font-bold text-lg">{points}</div>
            <div className="text-xs text-muted-foreground">Points</div>
          </div>
          <div className="text-center p-3 bg-accent/50 rounded-xl">
            <Flame className="w-5 h-5 text-warning mx-auto mb-1" />
            <div className="font-bold text-lg">{streak}</div>
            <div className="text-xs text-muted-foreground">Day Streak</div>
          </div>
          <div className="text-center p-3 bg-accent/50 rounded-xl">
            <Target className="w-5 h-5 text-success mx-auto mb-1" />
            <div className="font-bold text-lg">{completed}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="bg-card rounded-2xl shadow-soft border border-border/50 p-4">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          Badges ({earnedBadges.length}/{badges.length})
        </h3>

        <div className="grid grid-cols-3 gap-2">
          {badges.map((badge) => (
            <div
              key={badge.name}
              className={`text-center p-2 rounded-xl transition-all ${
                badge.earned
                  ? 'bg-accent'
                  : 'bg-secondary/50 opacity-50 grayscale'
              }`}
              title={badge.description}
            >
              <span className="text-2xl">{badge.icon}</span>
              <div className="text-xs font-medium mt-1 line-clamp-1">{badge.name}</div>
            </div>
          ))}
        </div>

        {/* Next Badge */}
        {nextBadge && (
          <div className="mt-4 p-3 bg-secondary/50 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-xl grayscale">{nextBadge.icon}</span>
              <div>
                <div className="text-sm font-medium">Next: {nextBadge.name}</div>
                <div className="text-xs text-muted-foreground">{nextBadge.description}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Encouragement */}
      <div className="bg-gradient-to-br from-primary/10 to-accent rounded-2xl p-4 text-center">
        <div className="text-3xl mb-2">
          {streak >= 7 ? '🌟' : streak >= 3 ? '⭐' : '✨'}
        </div>
        <p className="text-sm font-medium">
          {streak >= 7
            ? "You're on fire! Amazing streak!"
            : streak >= 3
            ? 'Great job keeping up your streak!'
            : 'Complete tasks daily to build your streak!'}
        </p>
      </div>
    </div>
  );
}
