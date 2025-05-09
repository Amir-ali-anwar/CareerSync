import { StatusCodes } from "http-status-codes";
import { attachCookiesToResponse, createTokenUser,sendVerificationEmail } from '../utils/index.js';
import { BadRequestError, UnAuthenticatedError } from "../errors/index.js";
import crypto from "crypto";
import User from "../models/User.js";
import Token from "../models/Token.js";
const register = async (req, res, next) => {
  const { name, email, password, lastName, location, city, role, phone } =
    req.body;

  if (
    !name ||
    !email ||
    !password ||
    !lastName ||
    !location ||
    !city ||
    !role ||
    !phone
  ) {
    throw new BadRequestError("Please provide all the values");
  }

  const isAlready = await User.findOne({ email });
  if (isAlready) {
    throw new BadRequestError("Email already exists");
  }

  const verificationToken = crypto.randomBytes(40).toString("hex");

  const user = await User.create({
    name,
    email,
    password,
    lastName,
    location,
    city,
    role,
    phone,
    verificationToken,
  });

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
  let refreshToken = '';
  const existingToken = await Token.findOne({ user: user._id });
  if(existingToken){
    const { isValid } = existingToken;
    if (!isValid) {
      throw new CustomError.UnauthenticatedError('Invalid Credentials');
    }
    refreshToken=existingToken.refreshToken
    attachCookiesToResponse({ res, user: tokenUser, refreshToken });
  }
  refreshToken= crypto.randomBytes(40).toString('hex');
  const userAgent = req.headers['user-agent'];
  const ip = req.ip;
  const userToken= {refreshToken,ip,userAgent,user:user._id};
  await Token.create(userToken)
  attachCookiesToResponse({ res, user: tokenUser,refreshToken });

  res.status(StatusCodes.OK).json({tokenUser })
};

const updateUser = async (req, res, next) => {
  const { email, name } = req.body;
  if (!email || !name) {
    throw new CustomError.BadRequestError('Please provide all values');
  }
  const user = await User.findOne({ _id: req.user.userId });

  user.email = email;
  user.name = name;

  await user.save();

  const tokenUser = createTokenUser(user);
  attachCookiesToResponse({ res, user: tokenUser });
  res.status(StatusCodes.OK).json({ user: tokenUser });
};
const showCurrentUser = async (req, res) => {
  res.status(StatusCodes.OK).json({ user: req.user });
};
const logout = async (req, res) => {
  res.cookie('token', 'logout', {
    httpOnly: true,
    expires: new Date(Date.now() + 1000),
  });
  res.status(StatusCodes.OK).json({ msg: 'user logged out!' });
};

export { register, login, updateUser,logout,showCurrentUser };
