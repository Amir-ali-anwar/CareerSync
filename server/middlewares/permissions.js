import { UnAuthenticatedError } from "../errors/index.js";

const authorizePermissions = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new UnAuthenticatedError("Unauthorized to access this route");
    }
    next();
  };
};
export default authorizePermissions;
