# Account Management Template - Backend

A comprehensive Node.js backend API for user account management with authentication, authorization, and admin functionality.

## Features

### Authentication & Security
- User registration with email verification
- Secure login with Argon2id password hashing
- JWT-based authentication (Access + Refresh tokens)
- Google OAuth 2.0 integration
- Session management with httpOnly cookies
- Rate limiting and security headers
- Password reset functionality

### User Management
- User profiles with role-based access control
- Email verification system
- Password change functionality
- Session management (view/revoke sessions)
- Account deletion (soft delete)
- User preferences and settings

### Admin Features
- Admin dashboard with statistics
- User search, filter, and pagination
- User management (enable/disable accounts)
- Role assignment and management
- Bulk operations on users
- System cleanup tools
- Activity logging and monitoring

### Technical Features
- MySQL database with comprehensive schema
- Clean architecture with service layers
- Comprehensive error handling
- Request validation with express-validator
- Database migrations and initialization
- Health check endpoints
- CORS configuration for multiple frontends

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MySQL 8.0+
- **Authentication**: JWT + Argon2id
- **Validation**: express-validator
- **Security**: Helmet, CORS, Rate limiting
- **OAuth**: Passport.js with Google Strategy

## Quick Start

### Prerequisites

- Node.js 18 or higher
- MySQL 8.0 or higher
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd account-management-template/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Database
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=account_management
   
   # JWT Secrets (Generate secure keys!)
   JWT_ACCESS_SECRET=your_super_secure_access_secret
   JWT_REFRESH_SECRET=your_super_secure_refresh_secret
   
   # Admin Bootstrap (Optional)
   ADMIN_EMAIL=admin@yourdomain.com
   ADMIN_TEMP_PASSWORD=TempAdmin123!
   ```

4. **Database setup**
   ```bash
   # Initialize database and tables
   npm run init-db
   ```

5. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

The server will start on `http://localhost:3000`

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | User registration |
| POST | `/auth/login` | User login |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | User logout |
| POST | `/auth/verify-email` | Verify email address |
| POST | `/auth/verify-email/resend` | Resend verification email |
| POST | `/auth/password/forgot` | Request password reset |
| POST | `/auth/password/reset` | Reset password |
| GET | `/auth/oauth/google` | Google OAuth login |
| GET | `/auth/me` | Get current user info |

### User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user/profile` | Get user profile |
| PATCH | `/user/profile` | Update user profile |
| POST | `/user/password/change` | Change password |
| GET | `/user/sessions` | Get user sessions |
| DELETE | `/user/sessions/:id` | Revoke session |
| GET | `/user/export` | Export user data (GDPR) |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/dashboard/stats` | Dashboard statistics |
| GET | `/admin/users` | Get users with pagination |
| GET | `/admin/users/:id` | Get user details |
| PATCH | `/admin/users/:id` | Update user |
| POST | `/admin/users/:id/roles` | Assign role |
| DELETE | `/admin/users/:id/roles/:role` | Remove role |
| GET | `/admin/activity` | System activity log |
| POST | `/admin/system/cleanup` | Clean expired data |

## Configuration

### Environment Variables

Key configuration options:

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=account_management

# JWT
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# CORS
CORS_ORIGINS=http://localhost:3001,http://localhost:3002

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Admin Bootstrap
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_TEMP_PASSWORD=secure_temp_password
```

### Security Configuration

The application includes several security measures:

- **Password Security**: Argon2id hashing with configurable parameters
- **JWT Security**: Separate secrets for access and refresh tokens
- **Session Security**: httpOnly, Secure, SameSite cookies
- **Rate Limiting**: Configurable rate limits per endpoint
- **CORS**: Configurable origins for cross-origin requests
- **Headers Security**: Helmet.js for security headers

## Database Schema

### Core Tables

- **users**: User accounts and profiles
- **roles**: Available user roles (member, admin)
- **user_roles**: User-role assignments
- **sessions**: Refresh token sessions
- **email_verifications**: Email verification tokens
- **password_resets**: Password reset tokens

### Relationships

- Users can have multiple roles (many-to-many)
- Users can have multiple active sessions
- Each user can have one pending email verification
- Each user can have one pending password reset

## Development

### Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── models/          # Database models
│   ├── middleware/      # Express middleware
│   ├── services/        # Business logic
│   ├── routes/          # API routes
│   ├── utils/           # Utility functions
│   └── server.js        # Main server file
├── database/
│   ├── init.sql         # Database schema
│   └── init.js          # Database initialization
└── package.json
```

### Available Scripts

```bash
# Development
npm run dev          # Start with nodemon
npm start           # Start production server
npm run init-db     # Initialize database
npm test           # Run tests (if configured)
```

### Adding New Features

1. **Models**: Add database models in `src/models/`
2. **Services**: Add business logic in `src/services/`
3. **Routes**: Add API endpoints in `src/routes/`
4. **Middleware**: Add middleware in `src/middleware/`

## Deployment

### Production Setup

1. **Environment Configuration**
   ```bash
   NODE_ENV=production
   SESSION_COOKIE_SECURE=true
   JWT_ACCESS_SECRET=<secure-random-secret>
   JWT_REFRESH_SECRET=<secure-random-secret>
   ```

2. **Database Setup**
   - Use a dedicated MySQL instance
   - Enable SSL connections
   - Set up regular backups

3. **Process Management**
   ```bash
   # Using PM2
   pm2 start src/server.js --name "account-api"
   pm2 startup
   pm2 save
   ```

4. **Reverse Proxy**
   Configure nginx or similar for:
   - SSL termination
   - Rate limiting
   - Static file serving
   - Load balancing

### Docker Support

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Monitoring & Maintenance

### Health Checks
- `GET /health` - Basic health check
- `GET /api/admin/system/health` - Detailed system health

### Maintenance Tasks
- Regular cleanup of expired tokens and sessions
- Database performance monitoring
- Log rotation and management
- Security updates

### Performance Optimization
- Database indexing on frequently queried fields
- Connection pooling for database
- Redis caching (configurable)
- Response compression

## Security Considerations

### Best Practices Implemented
- Secure password hashing (Argon2id)
- JWT with short-lived access tokens
- Secure session management
- Input validation and sanitization
- Rate limiting to prevent abuse
- CORS configuration
- Security headers (Helmet.js)
- Environment-based configuration

### Recommendations
- Use HTTPS in production
- Regular security updates
- Monitor for suspicious activity
- Implement audit logging
- Use database SSL connections
- Regular backups

## Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check MySQL service
sudo systemctl status mysql
# Verify credentials
mysql -h localhost -u root -p
```

**Permission Errors**
```bash
# Grant necessary permissions
GRANT ALL PRIVILEGES ON account_management.* TO 'user'@'localhost';
FLUSH PRIVILEGES;
```

**JWT Token Issues**
- Ensure JWT secrets are set
- Check token expiration settings
- Verify client-server time sync

**OAuth Issues**
- Verify Google OAuth credentials
- Check callback URL configuration
- Ensure proper CORS settings

## Support

For issues and questions:

1. Check the logs for error details
2. Verify environment configuration
3. Review API documentation
4. Check database connectivity

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.