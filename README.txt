# 🏨 Smart Stay

### Smart Accommodation & Guest Service Management Platform

Smart Stay is a full-stack accommodation management system designed to streamline resident services, facility reservations, maintenance requests, and lost & found management through a centralized web platform.

The platform enables residents to securely register, verify accounts through OTP authentication, book facilities, raise service requests, report lost or found items, and receive automated email notifications, while administrators can monitor and manage all activities through a dedicated dashboard.

---

## ✨ Features

### 🔐 Secure Authentication

Smart Stay provides secure user authentication with email verification.

Features include:

* User Registration
* User Login
* Email OTP Verification
* OTP Expiration Timer
* Resend OTP Support
* Session Management
* Admin Authentication

---

### 👤 Resident Dashboard

Residents can access a personalized dashboard to:

* View account information
* Submit service requests
* Book facilities
* Report lost items
* Report found items
* Track submitted requests

---

### 🛠 Service Request Management

Residents can submit maintenance and support requests.

Example:

```text
Electrical Issue

Plumbing Issue

Housekeeping Request

General Maintenance
```

Features:

* Request Submission
* Request Tracking
* Email Confirmation
* Admin Notifications

---

### 🏢 Facility Booking System

Book shared accommodation facilities through an easy-to-use reservation system.

Examples:

```text
Conference Room

Study Room

Recreation Area

Community Hall
```

Features:

* Facility Reservation
* Date Selection
* Booking Management
* Confirmation Emails

---

### 🔍 Lost & Found Management

A complete system for handling misplaced items.

Residents can:

* Report Lost Items
* Report Found Items
* Upload Item Images
* Provide Descriptions
* Specify Locations

Images are automatically included in notifications sent to administrators.

---

### 📧 Automated Email Notifications

Smart Stay automatically sends emails for:

* Account Registration
* OTP Verification
* Service Requests
* Facility Bookings
* Lost Item Reports
* Found Item Reports

Features:

* HTML Email Templates
* Image Attachments
* User Confirmations
* Admin Alerts

---

### 🛡 Admin Dashboard

Administrators can manage the entire platform through a centralized dashboard.

Capabilities include:

* View Registered Users
* Monitor Service Requests
* Manage Facility Bookings
* Review Lost & Found Reports
* Access Uploaded Images
* Track Resident Activities

---

## 🏛 System Architecture

```text
                    ┌───────────────┐
                    │   Frontend    │
                    │ HTML/CSS/JS   │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Express Server│
                    │   Node.js     │
                    └───────┬───────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼

 ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
 │ Auth Module │    │ Service Req │    │ Facility    │
 │ OTP System  │    │ Management  │    │ Booking     │
 └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
        │                  │                  │
        └──────────┬───────┴──────────┬───────┘
                   ▼                  ▼

           ┌─────────────┐    ┌─────────────┐
           │ Lost & Found│    │ Email System│
           │   Module    │    │ Notifications│
           └──────┬──────┘    └──────┬──────┘
                  │                  │
                  └──────────┬───────┘
                             ▼

                    ┌─────────────┐
                    │   MongoDB   │
                    └─────────────┘
```

---

## 🛠 Tech Stack

### Frontend

* HTML5
* CSS3
* JavaScript

### Backend

* Node.js
* Express.js

### Database

* MongoDB
* Mongoose

### Authentication

* Email OTP Verification
* Session Management

### Email Services

* Nodemailer
* SMTP Integration

### Deployment Ready

* Environment Variable Configuration
* MongoDB Integration
* Cloud Deployment Support

---

## 📊 Platform Capabilities

| Capability       | Description                        |
| ---------------- | ---------------------------------- |
| Authentication   | Secure OTP-based user verification |
| Service Requests | Maintenance and support management |
| Facility Booking | Shared facility reservation system |
| Lost & Found     | Item reporting and tracking        |
| Email Automation | Automated notifications and alerts |
| Admin Dashboard  | Centralized management portal      |
| Image Uploads    | Attach item images to reports      |

---

## 📁 Project Structure

```text
Smart-Stay/
│
├── public/
│   ├── css/
│   ├── js/
│   ├── images/
│   └── uploads/
│
├── views/
│   ├── login/
│   ├── register/
│   ├── dashboard/
│   ├── admin/
│   ├── service/
│   ├── booking/
│   └── lost-found/
│
├── models/
│   ├── User.js
│   ├── Booking.js
│   ├── ServiceRequest.js
│   ├── LostItem.js
│   └── FoundItem.js
│
├── routes/
├── middleware/
├── utils/
│
├── .env
├── server.js
└── package.json
```

---

## 🚀 Local Setup

### Clone Repository

```bash
git clone https://github.com/your-username/Smart-Stay.git

cd Smart-Stay
```

---

### Install Dependencies

```bash
npm install
```

---

### Configure Environment Variables

Create a `.env` file:

```env
PORT=3000

MONGO_URI=your_mongodb_connection_string

EMAIL_USER=your_email

EMAIL_PASS=your_email_password

SESSION_SECRET=your_secret_key
```

---

### Start Application

```bash
npm start
```

or

```bash
node server.js
```

Application URL:

```text
http://localhost:3000
```

---

## 📈 Future Improvements

* Role-Based Access Control
* Real-Time Notifications
* Mobile Application
* Analytics Dashboard
* Complaint Resolution Workflow
* QR-Based Resident Verification
* Online Payments
* Facility Availability Calendar

---

## 👨‍💻 Author

**Rohit Chowdary**

Computer Science Engineering Student

Built to improve accommodation management through secure authentication, service automation, facility booking, and resident support systems.

---

## ⭐ Why Smart Stay?

Smart Stay is more than a traditional accommodation management system.

It combines:

* Secure OTP Authentication
* Service Request Management
* Facility Reservations
* Lost & Found Tracking
* Automated Email Notifications
* Admin Monitoring Tools
* MongoDB-Powered Data Management

into a unified platform that simplifies accommodation operations and enhances the resident experience.
