import React from 'react';
import {
  Package,
  Calendar,
  Layers,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  Check,
  ArrowRight,
  Mic,
  Menu,
  Search,
  Plus,
  Bell,
  ChevronDown,
  MessageSquare,
  LogOut,
  Download,
  Edit2,
  Filter,
  X,
  Clock,
  ShoppingBag,
  User,
  Bot,
  MoreVertical,
  Send,
  Sun,
  Moon,
  BarChart2,
  FileText
} from 'lucide-react';

interface FigmaIconProps {
  name: string;
  size?: number;
  className?: string;
}

export const FigmaIcon: React.FC<FigmaIconProps> = ({ name, size = 18, className = '' }) => {
  if (name === 'whatsapp') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    );
  }

  const props = { size, className, strokeWidth: 1.5, 'aria-hidden': 'true' as const };

  switch (name) {
    case 'box':
      return <Package {...props} />;
    case 'calendar':
      return <Calendar {...props} />;
    case 'inventory':
      return <Layers {...props} />;
    case 'warning':
      return <AlertTriangle {...props} />;
    case 'trend':
      return <TrendingUp {...props} />;
    case 'sparkle':
      return <Sparkles {...props} />;
    case 'check':
      return <Check {...props} />;
    case 'arrow':
      return <ArrowRight {...props} />;
    case 'mic':
      return <Mic {...props} />;
    case 'menu':
      return <Menu {...props} />;
    case 'search':
      return <Search {...props} />;
    case 'plus':
      return <Plus {...props} />;
    case 'bell':
      return <Bell {...props} />;
    case 'chevron':
      return <ChevronDown {...props} />;
    case 'message':
      return <MessageSquare {...props} />;
    case 'logout':
      return <LogOut {...props} />;
    case 'download':
      return <Download {...props} />;
    case 'edit':
      return <Edit2 {...props} />;
    case 'filter':
      return <Filter {...props} />;
    case 'close':
      return <X {...props} />;
    case 'clock':
      return <Clock {...props} />;
    case 'bag':
      return <ShoppingBag {...props} />;
    case 'user':
      return <User {...props} />;
    case 'bot':
      return <Bot {...props} />;
    case 'more':
      return <MoreVertical {...props} />;
    case 'send':
      return <Send {...props} />;
    case 'sun':
      return <Sun {...props} />;
    case 'moon':
      return <Moon {...props} />;
    case 'analytics':
      return <BarChart2 {...props} />;
    case 'report':
      return <FileText {...props} />;
    default:
      return <Package {...props} />;
  }
};

