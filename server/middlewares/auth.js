import jwt from "jsonwebtoken";
import { UnAuthenticatedError } from "../errors/index.js";

const isTokenValid = (token) => jwt.verify(token, process.env.JWT_SECRET);

const authenticateUser = async (req, res, next) => {
  const { accessToken } = req.signedCookies;

  if (!accessToken) {
    throw new UnAuthenticatedError("Authentication Invalid");
  }

  try {
    const payload = isTokenValid(accessToken);
    req.user = payload.user; // { name, userId, role }
    next();
  } catch (error) {
    throw new UnAuthenticatedError("Authentication Invalid");
  }
};

export default authenticateUser;
