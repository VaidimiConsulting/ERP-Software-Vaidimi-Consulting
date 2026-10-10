/**
 * Role-Based Access Control Middleware
 * @param  {...string} allowedRoles Roles permitted to access the route
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Authentication required before role check.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: You do not have permission to perform this action. Required role(s): [${allowedRoles.join(
          ', '
        )}]. Your role: ${req.user.role}`,
      });
    }

    next();
  };
}

module.exports = {
  authorizeRoles,
};
