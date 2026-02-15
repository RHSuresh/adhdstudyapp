import { Link } from 'react-router-dom';
import { GraduationCap, Users, School, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import webquityLogo from '@/assets/webquity-logo.png';

const Index = () => {
  const portals = [
    {
      role: 'student',
      title: 'Student',
      description: 'Complete tasks, earn points, and level up!',
      icon: GraduationCap,
      color: 'bg-primary',
      href: '/auth/student',
    },
    {
      role: 'parent',
      title: 'Parent',
      description: "Monitor your child's progress and achievements",
      icon: Users,
      color: 'bg-success',
      href: '/auth/parent',
    },
    {
      role: 'teacher',
      title: 'Teacher',
      description: 'Assign tasks and approve completions',
      icon: School,
      color: 'bg-warning',
      href: '/auth/teacher',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="container max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center gap-3">
          <img src={webquityLogo} alt="Webquity" className="h-28" />
        </div>
      </header>

      {/* Hero */}
      <main className="container max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent rounded-full text-sm font-medium text-accent-foreground mb-6">
            Built for students with ADHD
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Stay focused,<br />
            <span className="text-primary">one task at a time</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            A calm, distraction-free learning app that helps students track tasks, 
            earn rewards, and build great habits.
          </p>
        </div>

        {/* Portal Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {portals.map((portal) => (
            <Link
              key={portal.role}
              to={portal.href}
              className="group bg-card rounded-2xl p-6 shadow-soft border border-border/50 hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`w-14 h-14 ${portal.color} rounded-2xl flex items-center justify-center mb-4`}>
                <portal.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="font-bold text-xl mb-2">{portal.title}</h3>
              <p className="text-muted-foreground text-sm mb-4">{portal.description}</p>
              <div className="flex items-center text-primary font-medium text-sm group-hover:gap-2 transition-all">
                Get started
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>

        {/* Features */}
        <div className="mt-20 text-center">
          <h3 className="font-bold text-2xl mb-8">Why Webquity?</h3>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div>
              <div className="text-4xl mb-3">🎯</div>
              <h4 className="font-semibold mb-2">Simple & Calm</h4>
              <p className="text-sm text-muted-foreground">
                Minimalist design that won't overwhelm or distract
              </p>
            </div>
            <div>
              <div className="text-4xl mb-3">🏆</div>
              <h4 className="font-semibold mb-2">Gamified</h4>
              <p className="text-sm text-muted-foreground">
                Earn points, badges, and maintain streaks
              </p>
            </div>
            <div>
              <div className="text-4xl mb-3">👥</div>
              <h4 className="font-semibold mb-2">Connected</h4>
              <p className="text-sm text-muted-foreground">
                Parents and teachers stay in the loop
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container max-w-6xl mx-auto px-4 py-8 mt-12 border-t border-border/50">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          Webquity — Helping students succeed
        </div>
      </footer>
    </div>
  );
};

export default Index;
