import { Task, ChatMessage, TaskCategory, TaskPriority } from '@/types/task';

// Simulated AI responses based on user input
export function generateBotResponse(userMessage: string, tasks: Task[]): string {
  const lowerMessage = userMessage.toLowerCase();

  // Check for task-related queries
  if (lowerMessage.includes('add') && (lowerMessage.includes('task') || lowerMessage.includes('homework'))) {
    return "I'd love to help you add a task! 📝 Just tell me:\n• What's the task called?\n• When is it due?\n• Is it homework, reading, or a project?";
  }

  if (lowerMessage.includes('what') && (lowerMessage.includes('due') || lowerMessage.includes('today'))) {
    const todayTasks = tasks.filter(t => {
      if (!t.dueDate || t.completed) return false;
      const today = new Date();
      const dueDate = new Date(t.dueDate);
      return dueDate.toDateString() === today.toDateString();
    });

    if (todayTasks.length === 0) {
      return "You have no tasks due today! 🎉 Great job staying on top of things!";
    }

    return `You have ${todayTasks.length} task${todayTasks.length > 1 ? 's' : ''} due today:\n${todayTasks.map(t => `• ${t.title}`).join('\n')}\n\nYou've got this! 💪`;
  }

  if (lowerMessage.includes('help') && lowerMessage.includes('focus')) {
    return "Here are some focus tips! 🧘\n\n1. Take a deep breath\n2. Put your phone away\n3. Work for 15 minutes, then take a short break\n4. Drink some water\n\nYou can do this! I believe in you! ⭐";
  }

  if (lowerMessage.includes('how many') && lowerMessage.includes('task')) {
    const incomplete = tasks.filter(t => !t.completed).length;
    const complete = tasks.filter(t => t.completed).length;
    return `You have ${incomplete} task${incomplete !== 1 ? 's' : ''} to do and ${complete} completed! ${incomplete === 0 ? '🎉 Amazing job!' : 'Keep going! 💪'}`;
  }

  if (lowerMessage.includes('remind') || lowerMessage.includes('reminder')) {
    return "I can help you remember things! ⏰ Just tell me what you want to be reminded about and when. For example: 'Remind me to read chapter 5 at 4pm'";
  }

  if (lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('hey')) {
    const greetings = [
      "Hi there, superstar! 🌟 Ready to tackle your tasks today?",
      "Hello! 👋 I'm here to help you stay focused and get things done!",
      "Hey! Great to see you! What can I help you with today? 😊",
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  if (lowerMessage.includes('thank')) {
    return "You're so welcome! 💙 I'm always here to help. Keep being awesome!";
  }

  if (lowerMessage.includes('done') || lowerMessage.includes('finish') || lowerMessage.includes('complete')) {
    return "That's fantastic! 🎉 Checking off tasks feels great, doesn't it? What's next on your list?";
  }

  // Default responses
  const defaultResponses = [
    "I'm here to help! You can ask me to:\n• Add a new task\n• Check what's due today\n• Get focus tips\n• Set reminders",
    "Great question! Let me know if you want to add tasks, check your schedule, or get some focus tips! 😊",
    "I'm your focus buddy! Ask me about your tasks, or let me help you stay focused! 📚",
  ];

  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

// Generate a random task for demo purposes
export function generateSampleTasks(): Task[] {
  return [
    {
      id: '1',
      title: 'Read Chapter 5 of Science Book',
      description: 'Read about the water cycle and take notes',
      completed: false,
      dueDate: new Date(),
      priority: 'high',
      category: 'reading',
      createdBy: 'teacher',
      createdAt: new Date(Date.now() - 86400000),
    },
    {
      id: '2',
      title: 'Math Worksheet - Fractions',
      description: 'Complete problems 1-20 on page 45',
      completed: false,
      dueDate: new Date(Date.now() + 86400000),
      priority: 'medium',
      category: 'homework',
      createdBy: 'teacher',
      createdAt: new Date(Date.now() - 172800000),
    },
    {
      id: '3',
      title: 'Practice Spelling Words',
      completed: true,
      priority: 'low',
      category: 'practice',
      createdBy: 'parent',
      createdAt: new Date(Date.now() - 259200000),
    },
    {
      id: '4',
      title: 'Solar System Project',
      description: 'Create a poster about the planets',
      completed: false,
      dueDate: new Date(Date.now() + 604800000),
      priority: 'high',
      category: 'project',
      createdBy: 'teacher',
      createdAt: new Date(Date.now() - 432000000),
    },
  ];
}
