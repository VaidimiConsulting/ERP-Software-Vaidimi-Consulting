const express = require('express');
const router = express.Router();
const {
  getBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
} = require('../controllers/branchController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/constants');

// All authenticated users can view branches
router.use(authenticate);

router.get('/', getBranches);
router.get('/:id', getBranchById);

// Admin-only management
router.post('/', authorizeRoles(ROLES.ADMIN), createBranch);
router.put('/:id', authorizeRoles(ROLES.ADMIN), updateBranch);
router.delete('/:id', authorizeRoles(ROLES.ADMIN), deleteBranch);

module.exports = router;
