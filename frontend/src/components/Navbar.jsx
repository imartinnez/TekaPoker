import { NavLink } from 'react-router-dom'
import { Home, PlusCircle, Clock, Trophy, Users } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/',          icon: Home,       label: 'Inicio'   },
  { to: '/nueva',     icon: PlusCircle, label: 'Nueva'    },
  { to: '/historial', icon: Clock,      label: 'Historial' },
  { to: '/ranking',   icon: Trophy,     label: 'Ranking'  },
  { to: '/jugadores', icon: Users,      label: 'Jugadores' },
]

export default function Navbar() {
  return (
    <nav className="navbar">
      {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <Icon size={20} strokeWidth={1.8} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
