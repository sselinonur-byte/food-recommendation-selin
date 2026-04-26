const colorMap = {
  'Excellent': 'bg-green-600',
  'Very Good': 'bg-green-500',
  'Good': 'bg-yellow-500',
  'Average': 'bg-orange-400',
  'Poor': 'bg-red-500',
}

export default function RatingBadge({ rating, text }) {
  if (!rating || rating === 0) return <span className="text-xs text-gray-400">Not rated</span>
  const color = colorMap[text] || 'bg-gray-500'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-white text-xs font-semibold ${color}`}>
      ★ {parseFloat(rating).toFixed(1)}
    </span>
  )
}
