import { UnAuthenticatedError } from "../errors/index.js";

const authorizePermissions = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      throw new UnAuthenticatedError("Authentication Invalid");
    }
    if (!roles.includes(req.user.role)) {
      throw new UnAuthenticatedError("Unauthorized to access this route");
    }
    next();
  };
};

const checkPermissions = (requestUser, resourceUserId) => {
  if (requestUser.userId === resourceUserId.toString()) return;
  throw new UnAuthenticatedError("You can only perform actions to your created job");
};
export { checkPermissions, authorizePermissions }



