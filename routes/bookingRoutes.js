const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

// The requireAuth middleware is assumed to be available globally or passed in 
// Since it's defined in server.js, we will pass it as middleware during mount in server.js
// or we can just require it if we export it. For now, we will assume it's added in server.js:
// app.use('/api/bookings', requireAuth, bookingRoutes);

router.post('/', bookingController.createBooking);
router.get('/all-active', bookingController.getAllActiveBookings);
router.get('/', bookingController.getBookings);
router.delete('/:id', bookingController.deleteBooking);
router.patch('/:id/usage', bookingController.markUsed);

router.post('/report/:id', bookingController.reportBooking);
router.post('/checkin/:id', bookingController.checkIn);

module.exports = router;
