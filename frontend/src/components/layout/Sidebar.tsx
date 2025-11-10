import { NavLink } from 'react-router-dom'
import {
  Home,
  MessageSquare,
  DollarSign,
  FileText,
  PieChart,
  Tag,
  Settings,
  Users,
  Upload,
} from 'lucide-react'

interface NavItem {
  to: string
  icon: React.ComponentType<{ className?: string }>
  label: string
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/transactions', icon: DollarSign, label: 'Transactions' },
  { to: '/groups', icon: Users, label: 'Groups' },
  { to: '/budgets', icon: PieChart, label: 'Budgets' },
  { to: '/statements', icon: FileText, label: 'Statements' },
  { to: '/upload', icon: Upload, label: 'Upload' },
  { to: '/tags', icon: Tag, label: 'Tags' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-screen">
      {/* Logo/Header */}
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-lg font-bold">Expense Tracker</h1>
        <p className="text-xs text-gray-400">AI-Powered</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 text-sm transition ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer/User Info */}
      <div className="p-4 border-t border-gray-800">
        <div className="text-xs text-gray-400">
          <div>v1.0.0</div>
        </div>
      </div>
    </aside>
  )
}
