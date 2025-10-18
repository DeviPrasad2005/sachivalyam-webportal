# Gram Panchayat Portal - Digital Governance System

## 📋 Project Overview

The Gram Panchayat Portal is a comprehensive digital governance platform designed to modernize rural administration in India. This web-based application enables citizens to pay taxes, access government services, and stay informed about village activities online.

## 🎯 Key Features

### For Citizens
- **User Registration & Authentication**: Secure signup and login system
- **Tax Payment Services**:
  - House Tax Payment
  - Water Tax Payment
  - Other Taxes (Wealth, Sanitation, etc.)
  - Electricity Bill Payment
- **Receipt Management**: Download PDF receipts for all transactions
- **Announcements**: View Grama Sabha meetings and village updates
- **Government Schemes**: Information about welfare programs (PMAY, MGNREGA, Pensions)
- **Emergency Contacts**: Quick access to essential services
- **Notices**: Stay updated with important village notices

### For Administrators
- **Admin Dashboard**: Comprehensive overview of portal activities
- **User Management**: View and manage registered users
- **Payment Records**: Track all tax payments and transactions
- **Announcement Management**: Create, edit, and delete announcements
- **Reports & Analytics**: Generate PDF reports of payment data
- **Secure Authentication**: Protected admin routes with session management

## 🛠️ Technology Stack

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web application framework
- **MySQL**: Relational database
- **bcrypt**: Password hashing
- **express-session**: Session management

### Frontend
- **HTML5**: Markup
- **CSS3**: Styling with modern design patterns
- **JavaScript**: Client-side functionality
- **EJS**: Template engine for dynamic pages

### Additional Libraries
- **PDFKit**: PDF generation for receipts and reports
- **mysql2**: MySQL database driver

## 📦 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn package manager

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd Sachivalayam_pro
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Database Setup
1. Create MySQL database:
```bash
mysql -u root -p
```

2. Run the schema file:
```bash
mysql -u root -p < schema.sql
```

Or manually create the database:
```sql
CREATE DATABASE gram_db;
```

3. Update database credentials in `db.js`:
```javascript
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'your_password',
  database: 'gram_db'
});
```

### Step 4: Create Admin User
```bash
node insert-admin.js
```

Default admin credentials:
- Username: `deviPrasad`
- Password: `dileep_18`

**Important**: Change these credentials in `insert-admin.js` before running in production.

### Step 5: Start the Application
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The application will be available at: `http://localhost:3000`

## 📁 Project Structure

```
Sachivalayam_pro/
├── views/                      # HTML/EJS templates
│   ├── home.html              # Landing page
│   ├── login.html             # User login
│   ├── signup.html            # User registration
│   ├── dashboard.html         # User dashboard
│   ├── house-tax.html         # House tax payment
│   ├── water-tax.html         # Water tax payment
│   ├── other-taxes.html       # Other taxes payment
│   ├── electricity-bill.html  # Electricity bill payment
│   ├── announcements.html     # Public announcements
│   ├── schemes.html           # Government schemes
│   ├── notices.html           # Village notices
│   ├── emergency.html         # Emergency contacts
│   ├── download-reciepts.html # Receipt downloads
│   ├── admin-login.html       # Admin login
│   ├── admin-dashboard.html   # Admin dashboard
│   ├── admin-users.ejs        # User management
│   ├── admin-payments.ejs     # Payment records
│   ├── admin-announcements.ejs # Announcement list
│   ├── admin-announcement-new.ejs # Create announcement
│   ├── admin-announcement-edit.ejs # Edit announcement
│   ├── admin-user-taxes.html  # Admin tax amount management
│   ├── admin-user-tax-status.html # User tax status overview
│   ├── admin-user-tax-status-new.html # New tax status page
│   └── adminpanel.html        # Admin panel interface
├── downloads/                  # Generated PDF receipts
├── app.js                     # Main application file
├── db.js                      # Database configuration
├── admin.js                   # Admin routes (legacy)
├── insert-admin.js            # Admin user creation script
├── schema.sql                 # Database schema
├── package.json               # Project dependencies
├── .gitignore                 # Git ignore rules
├── .env.example               # Environment variables template
└── README.md                  # Project documentation
```

## 🔐 Security Features

- **Password Hashing**: All passwords are hashed using bcrypt
- **Session Management**: Secure session-based authentication
- **Route Protection**: Middleware to protect user and admin routes
- **SQL Injection Prevention**: Parameterized queries
- **Input Validation**: Server-side validation for all forms

## 🚀 Usage Guide

### For Citizens

1. **Registration**:
   - Visit `/signup`
   - Enter full name, email, and password
   - Submit to create account

2. **Login**:
   - Visit `/login`
   - Enter email and password
   - Access dashboard after successful login

3. **Pay Taxes**:
   - Navigate to respective tax payment page
   - Fill in required details
   - Complete payment via UPI
   - Download receipt

4. **View Announcements**:
   - Visit `/announcements`
   - View latest Grama Sabha updates

### For Administrators

1. **Admin Login**:
   - Visit `/admin/login`
   - Enter admin credentials
   - Access admin dashboard

2. **Manage Users**:
   - View all registered users
   - Delete user accounts if needed

3. **View Payments**:
   - Access payment records
   - Filter by tax type
   - Generate reports

4. **Manage Announcements**:
   - Create new announcements
   - Edit existing announcements
   - Delete outdated announcements

5. **Generate Reports**:
   - Visit `/admin/reports`
   - Download PDF report of all payments

## 🔧 Configuration

### Database Configuration
Edit `db.js` to update database credentials:
```javascript
const pool = mysql.createPool({
  host: 'localhost',
  user: 'your_username',
  password: 'your_password',
  database: 'gram_db'
});
```

### Session Secret
Update session secret in `app.js` for production:
```javascript
app.use(session({
  secret: 'your-secure-secret-key',
  resave: false,
  saveUninitialized: true,
}));
```

## 📊 Database Schema

The application uses 7 main tables:
- **users**: Citizen accounts
- **admins**: Administrator accounts
- **house_tax**: House tax payments
- **water_tax**: Water tax payments
- **other_tax**: Miscellaneous tax payments
- **electricity_bill**: Electricity bill payments
- **announcements**: Public announcements

See `schema.sql` for complete schema details.

## 🐛 Troubleshooting

### Database Connection Issues
- Verify MySQL is running
- Check database credentials in `db.js`
- Ensure `gram_db` database exists

### Port Already in Use
- Change port in `app.js`:
```javascript
app.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});
```

### Admin Login Not Working
- Run `node insert-admin.js` to create admin user
- Verify admin credentials in database

## 📝 API Endpoints

### Public Routes
- `GET /` - Home page
- `GET /signup` - Registration page
- `POST /signup` - Register new user
- `GET /login` - Login page
- `POST /login` - User authentication
- `GET /announcements` - View announcements
- `GET /api/announcements` - Get announcements (JSON)

### Protected User Routes
- `GET /dashboard` - User dashboard
- `GET /house-tax` - House tax payment
- `POST /pay-house-tax` - Submit house tax
- `GET /water-tax` - Water tax payment
- `POST /pay-water-tax` - Submit water tax
- `GET /other-taxes` - Other taxes payment
- `POST /pay-other-tax` - Submit other tax
- `GET /electricity-bill` - Electricity bill payment
- `POST /electricity-bill` - Submit electricity bill
- `GET /download/:type/:id` - Download receipt
- `GET /api/receipts` - Get all receipts (JSON)
- `POST /logout` - User logout

### Protected Admin Routes
- `GET /admin/login` - Admin login page
- `POST /admin/login` - Admin authentication
- `GET /admin/dashboard` - Admin dashboard
- `GET /admin/users` - User management
- `POST /admin/users/delete/:id` - Delete user
- `GET /admin/payments` - Payment records
- `GET /admin/reports` - Generate PDF report
- `GET /admin/announcements` - Announcement management
- `GET /admin/announcements/new` - Create announcement form
- `POST /admin/announcements/new` - Submit new announcement
- `GET /admin/announcements/edit/:id` - Edit announcement form
- `POST /admin/announcements/edit/:id` - Update announcement
- `POST /admin/announcements/delete/:id` - Delete announcement
- `POST /admin/logout` - Admin logout

## 🤝 Contributing

This project is developed for government submission. For any modifications or improvements:
1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit for review

## 📄 License

This project is developed for government use and is subject to applicable government regulations and policies.

## 👥 Contact & Support

For technical support or queries:
- Email: support@grampanchayat.gov.in
- Phone: 1800-XXX-XXXX

## 🙏 Acknowledgments

- Government of India - Digital India Initiative
- Ministry of Panchayati Raj
- State Rural Development Department

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Status**: Production Ready for Government Submission
