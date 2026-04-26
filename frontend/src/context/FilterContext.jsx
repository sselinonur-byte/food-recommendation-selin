import { createContext, useContext, useReducer, useCallback } from 'react'
import { getRestaurants } from '../api'

const FilterContext = createContext(null)

const initial = {
  query: '',
  city: '',
  cuisine: '',
  minRating: 0,
  maxCost: '',
  delivery: false,
  booking: false,
  page: 1,
  results: [],
  total: 0,
  loading: false,
  error: null,
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FILTER':
      return { ...state, ...action.payload, page: 1 }
    case 'SET_PAGE':
      return { ...state, page: action.payload }
    case 'FETCH_START':
      return { ...state, loading: true, error: null }
    case 'FETCH_SUCCESS':
      return {
        ...state,
        loading: false,
        results: action.page === 1
          ? action.payload.results
          : [...state.results, ...action.payload.results],
        total: action.payload.total,
      }
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload }
    default:
      return state
  }
}

export function FilterProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial)

  const search = useCallback(async (filters, page = 1) => {
    dispatch({ type: 'FETCH_START' })
    try {
      const res = await getRestaurants({ ...filters, page })
      dispatch({ type: 'FETCH_SUCCESS', payload: res.data, page })
    } catch (e) {
      dispatch({ type: 'FETCH_ERROR', payload: 'Failed to load restaurants.' })
    }
  }, [])

  const setFilter = useCallback((updates) => {
    dispatch({ type: 'SET_FILTER', payload: updates })
  }, [])

  const loadMore = useCallback(() => {
    dispatch({ type: 'SET_PAGE', payload: state.page + 1 })
  }, [state.page])

  return (
    <FilterContext.Provider value={{ state, search, setFilter, loadMore }}>
      {children}
    </FilterContext.Provider>
  )
}

export function useFilters() {
  return useContext(FilterContext)
}
