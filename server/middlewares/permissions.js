import { UnAuthenticatedError } from "../errors/index.js";

const authorizePermissions = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new UnAuthenticatedError("Unauthorized to access this route");
    }
    next();
  };
};

const checkPermissions = (requestUser, resourceUserId) => {
  if (requestUser.userId === resourceUserId.toString()) return;
  throw new UnAuthenticatedError("You can only delete your created job");
};
export {checkPermissions, authorizePermissions} 



