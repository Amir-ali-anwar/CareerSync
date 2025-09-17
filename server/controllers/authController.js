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

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - lastName
 *               - location
 *               - role
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *                 description: User's first name
 *                 example: John
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 minLength: 5
 *                 description: User's password
 *                 example: password123
 *               lastName:
 *                 type: string
 *                 description: User's last name
 *                 example: Doe
 *               location:
 *                 type: object
 *                 required:
 *                   - country
 *                   - city
 *                 properties:
 *                   country:
 *                     type: string
 *                     description: User's country
 *                     example: United States
 *                   city:
 *                     type: string
 *                     description: User's city
 *                     example: New York
 *               role:
 *                 type: string
 *                 enum: [talent, employer]
 *                 description: User's role
 *                 example: talent
 *               phone:
 *                 type: string
 *                 description: User's phone number
 *                 example: +1234567890
 *               companyName:
 *                 type: string
 *                 description: Company name (required for employer role)
 *                 example: Tech Corp
 *               companySize:
 *                 type: string
 *                 description: Company size (required for employer role)
 *                 example: 51-200
 *               industry:
 *                 type: string
 *                 description: Industry (required for employer role)
 *                 example: Technology
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: Success! Please check your email to verify your account
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const register = async (req, res) => {
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
  const verificationTokenExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const userData = {
    name,
    email,
    password,
    lastName,
    location, // already in { country, city } format
    role,
    phone,
    verificationToken,
    verificationTokenExpires,
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

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 description: User's password
 *                 example: password123
 *     responses:
 *       200:
 *         description: User logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tokenUser:
 *                   $ref: '#/components/schemas/User'
 *         headers:
 *           Set-Cookie:
 *             description: JWT tokens set in httpOnly cookies
 *             schema:
 *               type: string
 *               example: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure
 *       400:
 *         description: Bad request - missing credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - invalid credentials or unverified email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @swagger
 * /api/v1/auth/updateUser:
 *   patch:
 *     summary: Update user profile
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's new email address
 *                 example: john.doe@example.com
 *               name:
 *                 type: string
 *                 description: User's new first name
 *                 example: John
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @swagger
 * /api/v1/auth/updateUserPassword:
 *   patch:
 *     summary: Update user password
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 description: Current password
 *                 example: oldpassword123
 *               newPassword:
 *                 type: string
 *                 minLength: 5
 *                 description: New password
 *                 example: newpassword123
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: Success! Password Updated.
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const updateUserPassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new UnAuthenticatedError("Please provide both values");
  }
  if (oldPassword === newPassword) {
    throw new BadRequestError("New password must be different from the old password");
  }
  const user = await User.findOne({ _id: req.user.userId });
  const isPasswordCorrect = await user.comparePassword(oldPassword);

  if (!isPasswordCorrect) {
    throw new UnAuthenticatedError("Invalid Credentials");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  res.status(StatusCodes.OK).json({ msg: "Success! Password Updated." });
};

/**
 * @swagger
 * /api/v1/auth/showCurrentUser:
 *   get:
 *     summary: Get current user information
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const showCurrentUser = async (req, res) => {
  res.status(StatusCodes.OK).json({ user: req.user });
};


/**
 * @swagger
 * /api/v1/auth/resend-verification:
 *   post:
 *     summary: Resend email verification token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: john.doe@example.com
 *     responses:
 *       200:
 *         description: Verification email resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: Verification email resent. Please check your inbox.
 *       400:
 *         description: Bad request - validation error or account already verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - no account found with this email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const resendVerificationToken = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new BadRequestError("Please provide email");
  }
  const user = await User.findOne({ email });

  if (!user) {
    throw new UnAuthenticatedError("No account found with this email");
  }

  if (user.isVerified) {
    throw new BadRequestError("Account already verified");
  }

  const verificationToken = crypto.randomBytes(40).toString("hex");
  const verificationTokenExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  user.verificationToken = verificationToken;
  user.verificationTokenExpires = verificationTokenExpires;

  await user.save({validateBeforeSave:false});

  const origin = req.get("origin") || "http://localhost:3000";
  await sendVerificationEmail({
    name: user.name,
    email: user.email,
    verificationToken,
    origin,
  });

  res.status(StatusCodes.OK).json({
    msg: "Verification email resent. Please check your inbox.",
  });

};

/**
 * @swagger
 * /api/v1/auth/verify-Email:
 *   get:
 *     summary: Verify user email address
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: verificationToken
 *         required: true
 *         schema:
 *           type: string
 *         description: Email verification token
 *         example: abc123def456ghi789
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: User's email address
 *         example: john.doe@example.com
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: Email Verified
 *       401:
 *         description: Unauthorized - invalid token or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const verifyEmail = async (req, res) => {
  const { verificationToken, email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    throw new UnAuthenticatedError("Please provide valid email address");
  }
  if (user.verificationTokenExpires < new Date()) {
    throw new UnAuthenticatedError("Verification token expired. Please request a new one.");
  }
  if (verificationToken !== user.verificationToken) {
    throw new UnAuthenticatedError("Verification Failed");
  }
  (user.isVerified = true),
    (user.verified = Date.now()),
    (user.verificationToken = "");
    user.verificationTokenExpires = null;
  await user.save();
  res.status(StatusCodes.OK).json({ msg: "Email Verified" });
};

/**
 * @swagger
 * /api/v1/auth/logout:
 *   get:
 *     summary: Logout user
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: User logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: user logged out!
 *         headers:
 *           Set-Cookie:
 *             description: JWT tokens cleared from cookies
 *             schema:
 *               type: string
 *               example: accessToken=logout; HttpOnly; Secure; Expires=Thu, 01 Jan 1970 00:00:00 GMT
 */
const logout = async (req, res) => {
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
  resendVerificationToken
};
