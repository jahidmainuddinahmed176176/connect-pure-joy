import { json } from '@tanstack/start'
import { createAPIFileRoute } from '@tanstack/start/api'
import { prisma } from '../lib/prisma'

export const APIRoute = createAPIFileRoute('/api/destinations')({
  POST: async ({ request }) => {
    const body = await request.json()
    const { name, country, description } = body
    
    const destination = await prisma.destination.create({
      data: {
        name,
        country,
        description,
      },
    })
    
    return json({ success: true, destination })
  },
  
  GET: async () => {
    const destinations = await prisma.destination.findMany()
    return json(destinations)
  },
})