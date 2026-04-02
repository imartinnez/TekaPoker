import { Routes, Route } from 'react-router-dom'
import Navbar     from './components/Navbar'
import Home       from './pages/Home'
import NewGame    from './pages/NewGame'
import Results    from './pages/Results'
import History    from './pages/History'
import Ranking    from './pages/Ranking'
import Players    from './pages/Players'
import PlayerStats from './pages/PlayerStats'

export default function App() {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/"             element={<Home />}        />
        <Route path="/nueva"        element={<NewGame />}     />
        <Route path="/resultados"   element={<Results />}     />
        <Route path="/historial"    element={<History />}     />
        <Route path="/ranking"      element={<Ranking />}     />
        <Route path="/jugadores"    element={<Players />}     />
        <Route path="/jugador/:id"  element={<PlayerStats />} />
      </Routes>
      <Navbar />
    </div>
  )
}
