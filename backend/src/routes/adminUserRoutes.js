const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/adminUserController');

// User management routes
router.get('/', adminUserController.getUsers);
router.post('/', adminUserController.createUser);
router.put('/:id', adminUserController.updateUser);
router.delete('/:id', adminUserController.deleteUser);

module.exports = router;