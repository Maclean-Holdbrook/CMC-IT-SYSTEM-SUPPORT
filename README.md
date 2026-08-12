# Campus Fault Reporting System - Frontend

Modern web application for reporting and resolving campus facility faults.

## Tech Stack

- **Framework:** React 18
- **Build Tool:** Vite
- **Routing:** React Router v6
- **State Management:** Context API
- **HTTP Client:** Axios
- **Styling:** CSS3 with responsive design
- **Deployment:** Vercel

## Features

- Student complaint submission portal with image upload
- Admin dashboard with:
  - Real-time statistics and charts
  - Complaint management
  - Worker management
  - Ticket assignment
  - Admin account management
- Worker portal with:
  - Assigned ticket viewing
  - Ticket status updates
  - Personal dashboard
- Mobile-responsive design for all pages
- JWT-based authentication
- Protected routes
- Toast notifications
- Modal dialogs

## Local Development Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Backend API running (see backend repository)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Maclean-Holdbrook/cmc-.git
   cd cmc-
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your backend API URL:
   ```env
   VITE_API_URL=http://localhost:5000/api/v1
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173`

## Deployment to Vercel

### Method 1: Deploy via Vercel Dashboard

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Add New Project"
4. Import your frontend repository
5. Vercel will auto-detect it's a Vite project
6. Add environment variable:
   - `VITE_API_URL`: Your backend API URL (e.g., `https://your-backend-app.vercel.app/api/v1`)
7. Click "Deploy"

### Method 2: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. For production deployment:
   ```bash
   vercel --prod
   ```

### Environment Variables for Vercel

Add this environment variable in Vercel Project Settings:

```
VITE_API_URL=https://your-backend-app.vercel.app/api/v1
```

### After Deployment

1. Get your frontend URL from Vercel (e.g., `https://your-app.vercel.app`)
2. Update the backend's `CORS_ORIGIN` environment variable to match your frontend URL
3. Redeploy the backend with the updated CORS configuration

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Application Routes

### Public Routes
- `/` - Home page with portal selection
- `/submit-complaint` - Student complaint submission form

### Admin Routes (Protected)
- `/admin/login` - Admin login
- `/admin/dashboard` - Admin dashboard with statistics
- `/admin/complaints` - Complaint management
- `/admin/workers` - Worker management
- `/admin/settings` - Admin settings and profile

### Worker Routes (Protected)
- `/worker/login` - Worker login
- `/worker/dashboard` - Worker dashboard with assigned tickets

## Project Structure

```
src/
├── api/
│   ├── axios.js         # Axios configuration
│   └── services.js      # API service functions
├── components/
│   ├── common/          # Reusable components
│   │   ├── Modal.jsx
│   │   ├── Toast.jsx
│   │   ├── AlertModal.jsx
│   │   └── ConfirmDialog.jsx
│   └── ProtectedRoute.jsx
├── context/
│   └── AuthContext.jsx  # Authentication context
├── pages/
│   ├── Home.jsx         # Landing page
│   ├── staff/
│   │   └── StaffComplaintForm.jsx
│   ├── admin/
│   │   ├── AdminLogin.jsx
│   │   ├── AdminDashboard.jsx
│   │   ├── AdminComplaints.jsx
│   │   ├── AdminWorkers.jsx
│   │   └── AdminSettings.jsx
│   └── worker/
│       ├── WorkerLogin.jsx
│       └── WorkerDashboard.jsx
├── images/              # Static images
├── App.jsx              # Root component
└── main.jsx            # Application entry point
```

## Mobile Responsiveness

All pages are fully responsive with breakpoints at:
- Desktop: > 768px
- Mobile: ≤ 768px

Mobile optimizations include:
- Single-column layouts
- Horizontal table scrolling
- Touch-friendly buttons
- Optimized font sizes
- Responsive images

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Build Configuration

The project uses Vite for fast builds and hot module replacement (HMR). Configuration can be found in `vite.config.js`.

## Support

For issues or questions, please open an issue on GitHub.

## License

MIT
