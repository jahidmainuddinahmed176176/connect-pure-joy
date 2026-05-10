import { useState } from 'react'

export function AddDestination() {
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('Saving...')
    
    try {
      const res = await fetch('/api/destinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, country, description }),
      })
      
      if (res.ok) {
        setMessage('✅ Destination saved!')
        setName('')
        setCountry('')
        setDescription('')
      } else {
        setMessage('❌ Failed to save')
      }
    } catch (error) {
      setMessage('❌ Error saving')
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Add Destination</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Destination name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
        <input
          type="text"
          placeholder="Country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 border rounded"
          rows={3}
        />
        <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
          Save Destination
        </button>
      </form>
      {message && <p className="mt-4 text-center">{message}</p>}
    </div>
  )
}