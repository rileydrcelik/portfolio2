# Riley Drcelik Portfolio

A modern, full-stack portfolio website built with Next.js, featuring creative content management and e-commerce capabilities.

## Features

- **Portfolio Showcase**: Display music, artwork, projects, and apparel
- **Content Management**: Admin dashboard for easy content updates
- **E-commerce**: Stripe integration for apparel sales
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Modern Stack**: Next.js 14, TypeScript, Firebase Auth, PostgreSQL

## Tech Stack

### Frontend
- **Next.js 14** with App Router
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Headless UI** for accessible components
- **Framer Motion** for animations
- **Lucide React** for icons

### Backend & Services
- **PostgreSQL** for database
- **Firebase Auth** for authentication
- **AWS S3** for file storage
- **Stripe** for payments
- **Vercel** for deployment

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── music/             # Music subject page
│   ├── artwork/           # Artwork subject page
│   ├── projects/          # Projects subject page
│   ├── apparel/           # E-commerce page
│   └── admin/             # Admin dashboard
├── components/
│   ├── layout/            # Layout components
│   ├── sections/          # Page sections
│   ├── admin/             # Admin components
│   ├── ecommerce/         # E-commerce components
│   └── ui/                # Reusable UI components
├── lib/                   # Utility libraries
│   ├── database/          # Database schema and config
│   ├── firebase.ts        # Firebase configuration
│   ├── stripe.ts          # Stripe configuration
│   └── s3.ts              # AWS S3 configuration
├── types/                 # TypeScript type definitions
├── hooks/                 # Custom React hooks
├── contexts/              # React contexts
└── utils/                 # Utility functions
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Firebase project
- AWS S3 buckets
- Stripe account

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd rileydrcelik_portfolio
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp env.example .env.local
# Edit .env.local with your actual values
```

4. Set up the database
```bash
# Run the SQL schema in your PostgreSQL database
psql -d your_database < src/lib/database/schema.sql
```

5. Start the development server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the site.

## Environment Variables

See `env.example` for all required environment variables.

### Required Services
- **Firebase**: For authentication
- **PostgreSQL**: For data storage
- **AWS S3**: For file storage (images, videos, audio)
- **Stripe**: For payment processing

## Database Schema

The application uses PostgreSQL with the following main tables:
- `subjects` - Main content categories (music, artwork, projects, apparel)
- `albums` - Collections within each subject
- `content_items` - Individual pieces of content
- `products` - E-commerce products
- `orders` - Customer orders
- `users` - User accounts (for future social features)

## Deployment

The application is designed to be deployed on Vercel:

1. Connect your GitHub repository to Vercel
2. Set up environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

## Admin Dashboard

Access the admin dashboard at `/admin` to:
- Manage content across all subjects
- Upload and organize media files
- Process e-commerce orders
- View site analytics
- Configure site settings

## Future Features

- User authentication for visitors
- Social features (likes, comments, follows)
- Blog functionality
- Advanced analytics
- Content recommendation system

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is private and proprietary.