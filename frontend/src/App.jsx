import { Routes, Route } from 'react-router-dom'
import { FilterProvider } from './context/FilterContext'
import Home from './pages/Home'
import RestaurantDetail from './pages/RestaurantDetail'

export default function App() {
  return (
    <FilterProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/restaurant/:id" element={<RestaurantDetail />} />
      </Routes>
    </FilterProvider>
  )
}
