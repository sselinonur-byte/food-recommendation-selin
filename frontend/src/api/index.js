import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export function getRestaurants(filters = {}) {
  const params = {}
  if (filters.query) params.q = filters.query
  if (filters.city) params.city = filters.city
  if (filters.cuisine) params.cuisine = filters.cuisine
  if (filters.minRating) params.min_rating = filters.minRating
  if (filters.maxCost) params.max_cost = filters.maxCost
  if (filters.delivery) params.delivery = true
  if (filters.booking) params.booking = true
  params.page = filters.page || 1
  params.limit = filters.limit || 20
  return api.get('/restaurants', { params })
}

export function getRestaurantById(id) {
  return api.get(`/restaurants/${id}`)
}

export function getSimilarRestaurants(id, n = 10) {
  return api.get(`/restaurants/${id}/similar`, { params: { n } })
}

export function getCities() {
  return api.get('/cities')
}

export function getCuisines() {
  return api.get('/cuisines')
}

export function getRecommendations(userId, filters = {}, n = 10) {
  const params = { user_id: userId, n }
  if (filters.city)       params.city = filters.city
  if (filters.cuisine)    params.cuisine = filters.cuisine
  if (filters.minRating)  params.min_rating = filters.minRating
  if (filters.maxCost)    params.max_cost = filters.maxCost
  if (filters.priceRange) params.price_range = filters.priceRange
  if (filters.delivery)   params.delivery = true
  if (filters.booking)    params.booking = true
  if (filters.openOnly)   params.open_only = true
  return api.get('/recommendations', { params })
}

export function getSampleUsers() {
  return api.get('/recommendations/sample-users')
}
