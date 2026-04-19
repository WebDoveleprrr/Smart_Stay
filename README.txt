# 🏨 SMART STAY — Hostel Management System v5.0

### Intelligent Hostel Operations Platform (Full-Stack + AI Enabled)

---

## 📌 Overview

**Smart Stay** is a scalable hostel management platform engineered to digitize and optimize hostel operations. It integrates automation, cloud infrastructure, and AI-driven capabilities to streamline processes such as room allocation, service requests, facility booking, and lost & found management.

The system is designed with a modular full-stack architecture and supports real-world deployment using modern cloud services.

---

## 🔐 Admin Access

* **Email:** [bikkinarohitchowdary@gmail.com](mailto:bikkinarohitchowdary@gmail.com)
* **Password:** Rohit@1234

> Admin authentication bypasses OTP for streamlined access.

---

## ⚙️ Technology Stack

### Frontend

* HTML5, CSS3, JavaScript

### Backend

* Node.js
* Express.js

### Database

* MongoDB (Local + Atlas Cloud)

### Authentication

* OTP-based email authentication
* Session management using MongoDB

### Cloud & Media

* Cloudinary (image upload and storage)

### AI Module

* Image similarity detection using pretrained deep learning models (MobileNet / PyTorch)

### Deployment

* Railway / Render

---

## ✨ Core Features

### 🔑 Authentication & Access Control

* Secure OTP-based login and registration
* Admin direct access (OTP bypass)
* Persistent session handling

### 🏠 Room Management

* Structured block and room navigation
* Efficient allocation system

### 🛠 Service Request System

* Issue reporting with tracking
* Automated email notifications

### 🏋️ Facility Booking

* Real-time booking of hostel facilities
* Booking history and tracking

### 🔍 Lost & Found (AI Powered)

* Image-based item reporting
* Cloudinary-backed image storage
* AI-driven similarity matching for identifying items

### 📊 Dashboard & Analytics

* System overview with key metrics
* Unified activity feed (requests + bookings)

### 📧 Notification System

* OTP verification emails
* Event-based notifications (registration, bookings, requests)

---

## 🤖 AI Image Matching System

The platform integrates a lightweight deep learning pipeline to enhance the lost & found module:

* Feature extraction using pretrained CNN models
* Vector-based similarity comparison
* Automated matching between uploaded images
* Improves identification accuracy and user experience

---

## ☁️ Deployment & Environment Configuration

The application is cloud-ready and supports deployment on platforms such as **Railway** and **Render**.

### Required Environment Variables

```
MONGO_URI        = MongoDB Atlas connection string  
MAIL_USER        = Email service username  
MAIL_PASS        = Email app password  
CLOUDINARY_URL   = Cloudinary configuration string  
PORT             = 3000  
```

---

## 📁 Project Architecture

```
├── server.js              # Application entry point  
├── routes/               # API route definitions  
├── models/               # MongoDB schemas  
├── controllers/          # Business logic layer  
├── public/               # Frontend assets  
├── uploads/              # Temporary file storage  
├── ai-service/           # AI image matching module  
```

---

## ⚠️ Operational Notes

* Render free tier may introduce cold start delays
* Railway provides faster response for production demos
* Secure all environment variables before deployment
* Ensure proper configuration of Cloudinary and email services

---

## 🆕 Version Highlights (v5.0)

* AI-powered image matching system
* Cloudinary integration for scalable media handling
* MongoDB Atlas cloud database support
* Persistent session management
* Enhanced UI navigation and activity tracking
* Production-ready deployment architecture

---

## 📄 Reference

This version builds upon the previous system configuration and extends it with cloud and AI capabilities.
Original base documentation: 

---

## 🚀 Conclusion

Smart Stay evolves traditional hostel management into an intelligent, automated, and scalable system by combining full-stack engineering with AI-driven enhancements.

---
