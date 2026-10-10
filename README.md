# Enterprise Company Management System

> Complete Company Employee, Leave, Attendance, and Project Management System built with **React.js (Vite)**, **Node.js (Express)**, and **MySQL (Sequelize ORM)**.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, React Router, Axios, Custom Modern CSS Design System (CSS Custom Properties).
- **Backend**: Node.js, Express.js, REST APIs, Sequelize ORM, JWT Authentication, bcryptjs password hashing.
- **Database**: MySQL 8.0 (Relational schema with 13 normalized tables and foreign keys).
- **Language**: 100% JavaScript (beginner-friendly and modular).

---

## 📁 Project Architecture & Folder Structure

```text
company-management-system/
├── client/                               # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/                   # Reusable UI components (common, layout)
│   │   ├── context/                      # React Context providers (Auth, Theme)
│   │   ├── hooks/                        # Custom hooks
│   │   ├── layouts/                      # Layout wrappers (Admin, Employee, Auth)
│   │   ├── pages/                        # Feature pages (Admin, Employee, Auth)
│   │   ├── routes/                       # Router definitions & route guards
│   │   ├── services/                     # Axios API client & services
│   │   ├── styles/                       # Modular CSS (variables, global, components)
│   │   ├── utils/                        # Formatters & date helpers
│   │   ├── App.jsx                       # Main App component
│   │   └── main.jsx                      # Vite entry point
│   ├── package.json
│   └── vite.config.js
│
├── server/                               # Backend (Node.js + Express)
│   ├── src/
│   │   ├── config/                       # Database (Sequelize) & constants
│   │   ├── controllers/                  # Route request handlers
│   │   ├── middleware/                   # JWT auth, role RBAC, error handlers
│   │   ├── models/                       # Sequelize models & associations
│   │   ├── routes/                       # Express route modules
│   │   ├── services/                     # Business logic
│   │   ├── utils/                        # Security & helper functions
│   │   └── app.js                        # Express app setup
│   ├── .env.example                      # Environment variables template
│   ├── .env                              # Local environment configuration
│   ├── package.json
│   └── server.js                         # Server entry point
│
├── package.json                          # Root runner scripts
└── README.md                             # Documentation
```

---

## ⚙️ Configuration & Setup

### 1. Prerequisites
- **Node.js**: v18 or higher (v24 tested)
- **MySQL Server**: 8.0 or higher running on port 3306

### 2. Configure Database Credentials
Open `server/.env` and enter your MySQL `root` password:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=3306
DB_NAME=company_management_db
DB_USER=root
DB_PASSWORD=your_mysql_password

JWT_SECRET=super_secret_company_management_jwt_key_2026
JWT_EXPIRES_IN=24h
```

> **Note**: The backend automatically executes `CREATE DATABASE IF NOT EXISTS \`company_management_db\`;` upon startup when supplied with valid MySQL credentials.

---

## 🚀 How to Run

### Starting Backend Server:
```bash
cd server
npm install
npm run dev
```
- Server URL: `http://localhost:5000`
- Health Check API: `http://localhost:5000/api/health`

### Starting Frontend Client:
```bash
cd client
npm install
npm run dev
```
- Client URL: `http://localhost:5173`

---

## 🧭 Project Roadmap & Phases

- [x] **Phase 1**: Project Setup, Folder Architecture, Vite React, Express Backend, MySQL connection check & Health API.
- [ ] **Phase 2**: Authentication & User Management (JWT, bcrypt, Login/Logout, Roles).
- [ ] **Phase 3**: Employee & Intern Management.
- [ ] **Phase 4**: Department Management.
- [ ] **Phase 5**: Project Management (Many-to-Many assignments).
- [ ] **Phase 6**: Project Milestones & Progress Tracking.
- [ ] **Phase 7**: Task Management.
- [ ] **Phase 8**: Attendance System (Check-in/Check-out).
- [ ] **Phase 9**: Leave Management (6 Leave types, approval workflows, menstrual leave confidentiality).
- [ ] **Phase 10**: Company Holidays Management.
- [ ] **Phase 11**: Company Calendar.
- [ ] **Phase 12**: Employee Project Portal.
- [ ] **Phase 13**: Admin Dashboard & Analytics.
- [ ] **Phase 14**: Employee Dashboard.
- [ ] **Phase 15**: Exportable Reports (CSV/Excel).
- [ ] **Phase 16**: In-App Notification System.
- [ ] **Phase 17 - 22**: Testing, UI Polish, Role Verification & Production Readiness.
