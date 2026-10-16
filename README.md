# Aegis Auth - Authentication & AI Risk Engine Backend

A robust Node.js & Express authentication backend service integrated with SQLite/PostgreSQL database, featuring JWT token-based authorization and middleware guards.

##  Full Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** SQLite (`aegis_auth.db`) / PostgreSQL
- **Security:** JSON Web Tokens (JWT), Bcrypt Password Hashing, Environment Management (`.env`)
- **Client App:** React Native / Expo (`aegis-auth-mobile`)

##  Core Features & Architecture
- **Request Flow:** `Request -> Authentication Middleware -> Route Controller -> Database`
- **JWT Protection:** Secure endpoint protection using `jwt.verify` middleware.
- **Secure Storage:** Encrypted passwords stored safely in database.
- **Environment Safety:** Configured `.env.example` template for clean credential setup.

##  Getting Started
1. Clone the repository
2. Install dependencies: `npm install`
3. Configure environment: Copy `.env.example` to `.env`
4. Start the server: `node server.js`
