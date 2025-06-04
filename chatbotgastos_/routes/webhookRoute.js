const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

router.get('/', webhookController.verificarWebhook);
router.post('/', webhookController.processarEventoWebhook);

module.exports = router;