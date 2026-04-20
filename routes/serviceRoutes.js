const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');

router.post('/', serviceController.createRequest);
router.get('/', serviceController.getRequests);
router.post('/rate/:id', serviceController.rateService);
router.get('/analytics', serviceController.getAnalytics);

module.exports = router;
