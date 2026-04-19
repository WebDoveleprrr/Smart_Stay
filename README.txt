    Smart Stay — Intelligent Hostel Management System

Version 5.0 | Full-Stack + AI Enabled | Deployed on Render

    Project Overview

Smart Stay is a complete hostel management platform designed to replace manual processes with a modern, automated system.

Instead of handling things like maintenance requests, bookings, or lost items on paper or WhatsApp, everything is managed through a single web application.

It combines:

A Node.js backend (API + logic)
MongoDB cloud database
Cloudinary for image storage
A separate Python AI service for image matching
    Who uses it?
    Students

Students can:

Raise service requests (electrician, cleaning, etc.)
Book facilities like gym or study hall
Report lost or found items
Track all their activity from a dashboard
    Admins

Admins get a separate control panel where they can:

Manage all students
Approve/update service requests
Monitor bookings
Handle lost & found cases
View system-wide stats
Block/unblock users
    Live Deployment
Main App: https://smart-stay-0gxx.onrender.com
AI Service: https://smart-stay-1.onrender.com
Health Check: https://smart-stay-1.onrender.com/health

    Note: Since this uses Render’s free tier, services may sleep.
First request after inactivity may take 30–90 seconds.

    Technology Stack
Frontend
HTML, CSS, JavaScript
Responsive layout using Grid & Flexbox
Clean typography using Google Fonts
Backend
Node.js + Express
MongoDB + Mongoose
Sessions with connect-mongo
Multer for file uploads
bcrypt for password security
Cloud Services
Cloudinary → image storage
SendGrid → email system
    AI Microservice
Python + FastAPI
PyTorch (MobileNetV2 model)
Pillow + NumPy
Used for image similarity matching
    System Architecture
Frontend (HTML pages)
→ talks to Node.js backend (REST API)
→ stores data in MongoDB
→ sends images to AI service
→ AI returns embeddings & matches
    Features
    Authentication & Security
Student registration with validation
Login with OTP-based 2FA
Admin login without OTP
Secure sessions stored in MongoDB
    Dashboard
Shows:
Service requests count
Bookings
Lost & found stats
Includes recent activity
Fully responsive (mobile + desktop)
    Service Requests
Categories: Electrician, Plumber, etc.
Priority levels: Normal / High / Urgent
Status tracking:
Pending → In Progress → Resolved
    Facility Booking
Book gym, study hall, etc.
Prevents double booking
Tracks booking status
Includes:
cancellation penalties
no-show detection
    Lost & Found (AI Powered)

This is the core highlight feature.

Flow:
Student uploads item + image
Image stored (Cloudinary or base64)
AI generates embedding (background process)
Matching compares items using cosine similarity
    AI Matching
Uses MobileNetV2 model
Generates feature vector (1280 dimensions)
Matches items with similarity ≥ 75%
Shows top 3 matches
    Email System
OTP emails
Booking confirmations
Notifications
Match confirmations

If SendGrid is not configured → emails are skipped safely

    Reliability Rating System

Each student has a rating out of 5:

Action	Effect
Booking used	+0.2
Cancelled	−0.5
No-show	−1.0

If rating < 3 → user gets blocked

    AI Pipeline (Simplified)
Image uploaded
Converted to base64
Sent to /embed
Processed by MobileNetV2
Feature vector stored
Matching uses cosine similarity
    API Overview
Auth
/api/register
/api/login
/api/verify-otp
Services
/api/services
Bookings
/api/bookings
Lost & Found
/api/lost-found
/api/match-image
Admin
/api/admin/...
AI
/embed
/similarity
/health
    Environment Variables

You need:

MongoDB URI
Session secret
SendGrid key
Cloudinary config
AI service URL

(Full list unchanged)

    Project Structure
smart-stay/
├── server.js
├── package.json
├── runtime.txt
├── index.html
├── login.html
├── dashboard.html
├── admin-dashboard.html
├── ai-service/
│   ├── main.py
│   └── requirements.txt
    Local Setup
Install dependencies
Configure .env
Run backend
Run AI service
    Deployment

Two services on Render:

Node.js backend
Python AI service

Optional:

Use UptimeRobot to keep AI awake
    Admin Credentials

Email: bikkinarohitchowdary@gmail.com

Password: Rohit@1234

    Known Limitations
Free tier → cold starts
AI embedding is async → slight delay
Base64 storage if Cloudinary missing
Email disabled if API key missing
    Final Note

Smart Stay is designed to:

automate hostel operations
reduce manual effort
integrate AI for smarter workflows
    Smart Stay v5.0

Built for real-world hostel automation with AI integration