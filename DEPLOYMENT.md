# Deployment Guide

This guide covers deploying the TaskFlow application with PostgreSQL backend to production.

## Prerequisites

- PostgreSQL database (NeonDB, Supabase, or self-hosted)
- Netlify account (for frontend deployment)
- Railway/Fly.io account (for backend deployment)
- Google OAuth credentials configured

## 1. Database Setup (PostgreSQL)

### Using NeonDB (Recommended)

1. **Create a NeonDB account** at [neon.tech](https://neon.tech)

2. **Create a new database**:
   - Create a new project
   - Note down the connection string
   - Run the schema: Copy contents of `server/database/schema.sql` and execute in the SQL editor

### Alternative: Supabase PostgreSQL

1. **Create Supabase project** (use only the database, not auth)
2. **Run the schema** in the SQL editor
3. **Get connection details** from Settings > Database

## 2. Backend Deployment (Railway)

### Railway Setup

1. **Create Railway account** at [railway.app](https://railway.app)

2. **Deploy from GitHub**:
   - Connect your GitHub repository
   - Select the repository
   - Railway will auto-detect Node.js

3. **Configure environment variables**:
   ```
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password  
   DB_HOST=your_db_host
   DB_NAME=your_db_name
   DB_PORT=5432
   
   JWT_SECRET=your-production-jwt-secret
   SESSION_SECRET=your-production-session-secret
   
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   
   NODE_ENV=production
   PORT=3001
   FRONTEND_URL=https://your-frontend-domain.netlify.app
   ```

4. **Configure build settings**:
   - Build command: `cd server && npm install`
   - Start command: `cd server && node app.js`

### Alternative: Fly.io Deployment

1. **Install Fly CLI** and login
2. **Create fly.toml** in server directory:
   ```toml
   app = "your-app-name"
   
   [build]
     dockerfile = "Dockerfile"
   
   [[services]]
     http_checks = []
     internal_port = 3001
     processes = ["app"]
     protocol = "tcp"
     script_checks = []
   
     [services.concurrency]
       hard_limit = 25
       soft_limit = 20
       type = "connections"
   
     [[services.ports]]
       force_https = true
       handlers = ["http"]
       port = 80
   
     [[services.ports]]
       handlers = ["tls", "http"]
       port = 443
   
     [[services.tcp_checks]]
       grace_period = "1s"
       interval = "15s"
       restart_limit = 0
       timeout = "2s"
   ```

3. **Create Dockerfile** in server directory:
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install --production
   COPY . .
   EXPOSE 3001
   CMD ["node", "app.js"]
   ```

4. **Deploy**: `fly deploy`

## 3. Frontend Deployment (Netlify)

### Build Configuration

1. **Build the project locally**:
   ```bash
   npm run build
   ```

2. **Deploy to Netlify**:
   - Connect your GitHub repository to Netlify
   - Set build command: `npm run build`
   - Set publish directory: `dist`

3. **Configure environment variables** in Netlify (none needed for this setup):
   ```
   # No environment variables needed for frontend
   # API calls go directly to your backend URL
   ```

### Alternative: Manual Deployment

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Deploy the `dist` folder** to your hosting provider

## 4. Environment Variables

### Backend (.env)
```
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=your_db_host  
DB_NAME=your_db_name
DB_PORT=5432

JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend-domain.com
```

### Frontend
No environment variables needed - API calls are made directly to the backend URL.

## 5. Google OAuth Setup

1. **Create OAuth credentials**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials

2. **Configure redirect URIs**:
   - Add your backend auth callback URL: `https://your-backend-domain.com/api/auth/google/callback`
   - Add your production domain

3. **Update backend environment variables**:
   - Add the Google OAuth credentials to your backend deployment
   - Ensure FRONTEND_URL points to your deployed frontend

## 6. Database Security

### Database Security Measures

The schema includes security measures:

- **Proper indexing**: Optimized queries for performance
- **Foreign key constraints**: Data integrity
- **Input validation**: Server-side validation
- **JWT authentication**: Secure session management

### Additional Security Measures

1. **API Rate Limiting**: Express rate limiting middleware
2. **Input Validation**: Client-side and database-level validation
3. **Error Handling**: Comprehensive error management
4. **Security Headers**: Helmet.js middleware
5. **CORS Configuration**: Proper CORS setup

## 7. Performance Optimization

### Database Optimization

1. **Indexes**: The schema includes optimized indexes for:
   - Task queries by creator
   - Status and due date filtering
   - Collaborator lookups
   - User email lookups

2. **Query Optimization**: 
   - Efficient joins with related data
   - Proper use of select clauses
   - Pagination for large datasets
   - Connection pooling

### Frontend Optimization

1. **Code Splitting**: Implemented with React.lazy
2. **Bundle Optimization**: Vite's built-in optimizations
3. **API Caching**: Client-side request caching
4. **CDN**: Netlify CDN for static assets

### Backend Optimization

1. **Connection Pooling**: PostgreSQL connection pooling
2. **Session Storage**: Efficient session management
3. **Compression**: Gzip compression middleware
4. **Static File Serving**: Optimized static file serving

## 8. Monitoring and Analytics

### Application Monitoring

Monitor your application through various tools:
- **Railway/Fly.io Dashboard**: Server metrics and logs
- **Database Provider**: Database performance metrics
- **Netlify Analytics**: Frontend performance and usage

### Application Monitoring

Consider adding:
- Error tracking (Sentry)
- Performance monitoring
- User analytics

## 9. Backup and Recovery

### Database Backups

Most PostgreSQL providers offer automatic backups:
- Point-in-time recovery
- Manual backup creation
- Export capabilities
- Automated daily backups

### Disaster Recovery

- Database replication
- Multi-region deployment
- Backup verification

## 10. Scaling Considerations

### Database Scaling

- Connection pooling
- Read replicas
- Vertical scaling options
- Query optimization

### Application Scaling

- Horizontal scaling (multiple server instances)
- Load balancing
- CDN integration
- Caching strategies

## 11. Troubleshooting

### Common Issues

1. **Authentication Problems**:
   - Check OAuth credentials
   - Verify redirect URIs
   - Confirm backend environment variables
   - Check CORS configuration

2. **Database Connection Issues**:
   - Verify database connection string
   - Check network connectivity
   - Review database permissions
   - Check connection pooling

3. **Real-time Updates Not Working**:
   - Confirm WebSocket connectivity
   - Check Socket.IO configuration
   - Verify server-client connection
   - Check firewall settings

### Debug Mode

Enable debug mode:
```bash
# Backend
NODE_ENV=development

# Check server logs
# Railway: View logs in dashboard
# Fly.io: fly logs
```

## 12. Production Checklist

- [ ] Database schema executed
- [ ] Backend deployed and running
- [ ] Environment variables configured
- [ ] Google OAuth set up
- [ ] Database security configured
- [ ] Application built and deployed
- [ ] Domain configured
- [ ] SSL certificate active
- [ ] Error tracking enabled
- [ ] Performance monitoring active
- [ ] Backup strategy implemented
- [ ] Rate limiting configured
- [ ] CORS properly set up

## 13. Post-Deployment

### Testing

1. **Functionality Testing**:
   - User registration/login
   - Task creation and editing
   - Real-time updates
   - Task sharing

2. **Performance Testing**:
   - Load testing
   - Database performance
   - Real-time scalability
   - API response times

3. **Security Testing**:
   - Authentication flows
   - Authorization checks
   - Input validation
   - Rate limiting
   - CORS configuration

### Monitoring

Set up monitoring for:
- Application errors
- Database performance
- User engagement
- System availability
- API usage and errors
- Real-time connection metrics

---

For support or questions, refer to the main README.md or create an issue in the repository.