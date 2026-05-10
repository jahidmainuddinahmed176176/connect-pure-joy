# Connect Pure Joy

A modern full-stack social platform built with TanStack Start, TypeScript, Tailwind CSS, Supabase, and Prisma.

## 🚀 Live Demo

https://connect-pure-joy.vercel.app

## ✨ Features

- 🔐 Authentication with Supabase
- 💬 Real-time chat
- 📽️ Video sharing
- 👥 Group discussions
- 📱 Responsive design

## 🛠️ Tech Stack

| Category | Technologies |
|----------|--------------|
| Frontend | TanStack Start, React, TypeScript, Tailwind CSS |
| Backend | Supabase, Prisma, PostgreSQL |
| Testing | Vitest, Playwright |
| DevOps | Docker, GitHub Actions |
| Deployment | Vercel |

## 📁 Project Structure


connect-pure-joy/

├── prisma/

├── src/

│   ├── components/

│   ├── integrations/

│   ├── lib/

│   ├── routes/

│   └── ...

├── .github/workflows/

├── supabase/

├── Dockerfile

├── package.json

├── vite.config.ts

├── tsconfig.json

└── ...





## 🏃‍♂️ Getting Started

### Prerequisites

- Node.js 20+
- npm or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/jahidmainuddinahmed176176/connect-pure-joy.git
cd connect-pure-joy

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev



```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Build image
docker build -t connect-pure-joy .

# Run container
docker run -p 3000:3000 connect-pure-joy
```


## 📝 Environment Variables

Create `.env.local` in your project root:

```env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
DATABASE_URL=your_database_url_here


## 📧 Contact

**Jahid Mainuddin Ahmed**
- GitHub: [@jahidmainuddinahmed176176](https://github.com/jahidmainuddinahmed176176)
- Email: jahidmainuddinahmed@gmail.com

---

⭐ Star this repository if you found it helpful!
