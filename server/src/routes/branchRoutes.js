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

// Admin and HR management
router.post('/', authorizeRoles(ROLES.ADMIN, ROLES.HR), createBranch);
router.put('/:id', authorizeRoles(ROLES.ADMIN, ROLES.HR), updateBranch);
router.delete('/:id', authorizeRoles(ROLES.ADMIN, ROLES.HR), deleteBranch);


module.exports = router;
