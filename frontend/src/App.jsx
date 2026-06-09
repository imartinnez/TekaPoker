import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Navbar      from './components/Navbar'
import Home        from './pages/Home'
import NewGame     from './pages/NewGame'
import Results     from './pages/Results'
import History     from './pages/History'
import Ranking     from './pages/Ranking'
import Players     from './pages/Players'
import PlayerStats from './pages/PlayerStats'
import Analytics   from './pages/Analytics'
import ChipCase    from './pages/ChipCase'
import Login       from './pages/Login'

function ProtectedLayout() {
  const isAuth = localStorage.getItem('tekapoker_auth') === 'true'
  if (!isAuth) return <Navigate to="/login" replace />
  return (
    <div className="app-container">
      <Outlet />
      <Navbar />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/"            element={<Home />}        />
        <Route path="/nueva"       element={<NewGame />}     />
        <Route path="/resultados"  element={<Results />}     />
        <Route path="/historial"   element={<History />}     />
        <Route path="/ranking"     element={<Ranking />}     />
        <Route path="/analisis"    element={<Analytics />}   />
        <Route path="/caja"        element={<ChipCase />}    />
        <Route path="/jugadores"   element={<Players />}     />
        <Route path="/jugador/:id" element={<PlayerStats />} />
      </Route>
    </Routes>
  )
}
