// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import { ModuleSelect } from './pages/ModuleSelect'
import { SessionStart } from './pages/SessionStart'
import { Dictation } from './pages/Dictation'
import { Results } from './pages/Results'
import { Dashboard } from './pages/Dashboard'
import { MathsStart } from './pages/MathsStart'
import { MathsPlay } from './pages/MathsPlay'
import { MathsEntry } from './pages/MathsEntry'
import { MathsResults } from './pages/MathsResults'
import { MathsDashboard } from './pages/MathsDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/child/:childId" element={<ModuleSelect />} />
        <Route path="/session-start/:childId" element={<SessionStart />} />
        <Route path="/dictation/:childId" element={<Dictation />} />
        <Route path="/results/:childId" element={<Results />} />
        <Route path="/dashboard/:childId" element={<Dashboard />} />
        <Route path="/maths-start/:childId" element={<MathsStart />} />
        <Route path="/maths-play/:childId" element={<MathsPlay />} />
        <Route path="/maths-entry/:childId" element={<MathsEntry />} />
        <Route path="/maths-results/:childId" element={<MathsResults />} />
        <Route path="/maths-dashboard/:childId" element={<MathsDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
