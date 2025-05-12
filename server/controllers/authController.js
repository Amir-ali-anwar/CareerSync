import { StatusCodes } from "http-status-codes";
import {
  attachCookiesToResponse,
  createTokenUser,
  sendVerificationEmail,
} from "../utils/index.js";
import { BadRequestError, UnAuthenticatedError } from "../errors/index.js";
import crypto from "crypto";
import User from "../models/User.js";
import Token from "../models/Token.js";
const register = async (req, res, next) => {
  const {
    name,
    email,
    password,
    lastName,
    location,
    role,
    phone,
    companyName,
    companySize,
    industry,
  } = req.body;

  if (
    !name ||
    !email ||
    !password ||
    !lastName ||
    !location?.country ||
    !location?.city ||
    !role ||
    !phone
  ) {
    throw new BadRequestError("Please provide all the values");
  }
  if (role === "employer") {
    if (!companyName || !companySize || !industry) {
      throw new BadRequestError(
        "Employer must provide companyName, companySize, and industry"
      );
    }
  }
  const isAlready = await User.findOne({ email });
  if (isAlready) {
    throw new BadRequestError("Email already exists");
  }

  const verificationToken = crypto.randomBytes(40).toString("hex");

  const userData = {
    name,
    email,
    password,
    lastName,
    location, // already in { country, city } format
    role,
    phone,
    verificationToken,
    ...(role === "employer" && { companyName, companySize, industry }),
  };

  if (role === "employer") {
    userData.company = {
      name: companyName,
      size: companySize,
      industry: industry,
    };
  }

  const user = await User.create(userData);
  // const user = await User.create({
  //   name,
  //   email,
  //   password,
  //   lastName,
  //   location,
  //   city,
  //   role,
  //   phone,
  //   verificationToken,
  // });

  const origin = req.get("origin") || "http://localhost:3000";

  await sendVerificationEmail({
    name: user.name,
    email: user.email,
    verificationToken: user.verificationToken,
    origin,
  });

  res.status(StatusCodes.CREATED).json({
    msg: "Success! Please check your email to verify your account",
  });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new BadRequestError("Please provide email and password");
  }
  const user = await User.findOne({ email });

  if (!user) {
    throw new UnAuthenticatedError("Invalid Credentials");
  }

  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    throw new UnAuthenticatedError("Invalid Credentials");
  }
  if (!user.isVerified) {
    throw new UnAuthenticatedError("Please verify your email");
  }
  const tokenUser = createTokenUser(user);
  //refresh token
  let refreshToken = "";
  const existingToken = await Token.findOne({ user: user._id });
  if (existingToken) {
    const { isValid } = existingToken;
    if (!isValid) {
      throw new UnAuthenticatedError("Invalid Credentials");
    }
    refreshToken = existingToken.refreshToken;
    attachCookiesToResponse({ res, user: tokenUser, refreshToken });
  }
  refreshToken = crypto.randomBytes(40).toString("hex");
  const userAgent = req.headers["user-agent"];
  const ip = req.ip;
  const userToken = { refreshToken, ip, userAgent, user: user._id };
  await Token.create(userToken);
  attachCookiesToResponse({ res, user: tokenUser, refreshToken });

  res.status(StatusCodes.OK).json({ tokenUser });
};

const updateUser = async (req, res, next) => {
  const { email, name } = req.body;
  if (!email || !name) {
    throw new BadRequestError("Please provide all values");
  }
  const user = await User.findOne({ _id: req.user.userId });

  user.email = email;
  user.name = name;

  await user.save();

  const tokenUser = createTokenUser(user);
  attachCookiesToResponse({ res, user: tokenUser });
  res.status(StatusCodes.OK).json({ user: tokenUser });
};

const updateUserPassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new UnAuthenticatedError("Please provide both values");
  }

  const user = await User.findOne({ _id: req.user.userId });
  const isPasswordCorrect = await user.comparePassword(oldPassword);

  if (!isPasswordCorrect) {
    throw new UnAuthenticatedError("Invalid Credentials");
  }

  user.password = newPassword;
  await user.save();

  res.status(StatusCodes.OK).json({ msg: "Success! Password Updated." });
};

const showCurrentUser = async (req, res) => {
  res.status(StatusCodes.OK).json({ user: req.user });
};
const verifyEmail = async (req, res) => {
  const { verificationToken, email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    throw new UnAuthenticatedError("Please provide valid email address");
  }
  if (verificationToken !== user.verificationToken) {
    throw new UnAuthenticatedError("Verification Failed");
  }
  (user.isVerified = true),
    (user.verified = Date.now()),
    (user.verificationToken = "");
  await user.save();
  res.status(StatusCodes.OK).json({ msg: "Email Verified" });
};

const logout = async (req, res) => {
  console.log({
    method: req.method,
    url: req.url,
    headers: req.headers,
    ip: req.ip,
  });
  res.cookie("accessToken", "logout", {
    httpOnly: true,
    expires: new Date(Date.now() + 1000),
    secure: process.env.NODE_ENV === "production",
    signed: true,
  });

  res.cookie("refreshToken", "logout", {
    httpOnly: true,
    expires: new Date(Date.now() + 1000),
    secure: process.env.NODE_ENV === "production",
    signed: true,
  });

  res.status(StatusCodes.OK).json({ msg: "user logged out!" });
};

export {
  register,
  login,
  updateUser,
  logout,
  showCurrentUser,
  verifyEmail,
  updateUserPassword,
};
