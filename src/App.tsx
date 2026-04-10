// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import { SessionStart } from './pages/SessionStart'
import { Dictation } from './pages/Dictation'
import { Results } from './pages/Results'
import { Dashboard } from './pages/Dashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/session-start/:childId" element={<SessionStart />} />
        <Route path="/dictation/:childId" element={<Dictation />} />
        <Route path="/results/:childId" element={<Results />} />
        <Route path="/dashboard/:childId" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
