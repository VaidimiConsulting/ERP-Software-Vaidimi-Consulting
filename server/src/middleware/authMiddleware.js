const { verifyToken } = require('../utils/token');
const { User, Employee, Department, Branch } = require('../models');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed. Missing or invalid Authorization header.',
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token not provided.',
      });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session token. Please log in again.',
      });
    }

    // Fetch user with associated employee profile and branch
    const user = await User.findByPk(decoded.id, {
      include: [
        {
          model: Employee,
          as: 'employeeProfile',
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['id', 'department_name'],
            },
            {
              model: Branch,
              as: 'branch',
              attributes: ['id', 'branch_code', 'branch_name', 'city'],
            },
          ],
        },
      ],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists.',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact your system administrator.',
      });
    }

    req.user = user;
    req.employee = user.employeeProfile || null;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal error during authentication: ' + error.message,
    });
  }
}

module.exports = {
  authenticate,
};
