import { StatusCodes } from "http-status-codes";
import { BadRequestError, UnAuthenticatedError } from "../errors/index.js";
import { verifyGoogleIdToken, createJWT, isTokenValid, issueSession } from "../utils/index.js";
import User from "../models/User.js";

const GOOGLE_PENDING_EXPIRY = "15m";
const TWO_FACTOR_PENDING_EXPIRY = "5m";

const issueTwoFactorTempToken = (userId) =>
  createJWT({
    payload: { twoFactorPending: { userId: userId.toString() } },
    expiresIn: TWO_FACTOR_PENDING_EXPIRY,
    secret: process.env.JWT_SECRET,
  });

/**
 * @swagger
 * /api/v1/auth/google:
 *   post:
 *     summary: Sign in (or begin sign-up) with a Google Identity Services ID token
 *     description: >
 *       Three outcomes: (1) a known Google-linked account -> logs straight in (or gates
 *       through 2FA if enabled, same as POST /login); (2) an existing password account
 *       with a Google-verified matching email -> links googleId to it and logs in;
 *       (3) no matching account -> responds needsOnboarding with a short-lived
 *       pendingToken, since this app requires role/phone/location Google can't supply -
 *       finish via POST /auth/google/complete.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken: { type: string, description: ID token from Google Identity Services }
 *     responses:
 *       200:
 *         description: Logged in, 2FA-gated, or needs onboarding (see description)
 *       401:
 *         description: Invalid Google token, or email not verified by Google
 */
const googleAuth = async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    throw new BadRequestError("Please provide idToken");
  }

  let payload;
  try {
    payload = await verifyGoogleIdToken(idToken);
  } catch (error) {
    throw new UnAuthenticatedError("Invalid Google sign-in");
  }

  const { sub: googleId, email, email_verified, given_name, family_name } = payload;

  let user = await User.findOne({ googleId }).select("+twoFactorSecret +twoFactorBackupCodes");

  if (!user) {
    const existingByEmail = await User.findOne({ email }).select(
      "+twoFactorSecret +twoFactorBackupCodes"
    );
    if (existingByEmail) {
      if (!email_verified) {
        throw new UnAuthenticatedError(
          "An account already exists for this email. Please log in with your password."
        );
      }
      existingByEmail.googleId = googleId;
      await existingByEmail.save({ validateBeforeSave: false });
      user = existingByEmail;
    }
  }

  if (!user) {
    if (!email_verified) {
      throw new UnAuthenticatedError("Google could not verify this email address");
    }
    const pendingToken = createJWT({
      payload: { googlePending: { googleId, email, name: given_name, lastName: family_name } },
      expiresIn: GOOGLE_PENDING_EXPIRY,
      secret: process.env.JWT_SECRET,
    });
    return res.status(StatusCodes.OK).json({
      needsOnboarding: true,
      pendingToken,
      profile: { email, name: given_name, lastName: family_name },
    });
  }

  if (user.twoFactorEnabled) {
    return res
      .status(StatusCodes.OK)
      .json({ requiresTwoFactor: true, tempToken: issueTwoFactorTempToken(user._id) });
  }

  const userAgent = req.headers["user-agent"] || "unknown";
  const tokenUser = await issueSession({ res, user, ip: req.ip, userAgent });
  res.status(StatusCodes.OK).json({ tokenUser });
};

/**
 * @swagger
 * /api/v1/auth/google/complete:
 *   post:
 *     summary: Finish creating an account for a first-time Google sign-in
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pendingToken, role, phone, location]
 *             properties:
 *               pendingToken: { type: string, description: Returned by POST /auth/google when needsOnboarding is true }
 *               role: { type: string, enum: [talent, employer] }
 *               phone: { type: string }
 *               location:
 *                 type: object
 *                 required: [country, city]
 *                 properties:
 *                   country: { type: string }
 *                   city: { type: string }
 *               companyName: { type: string, description: Required when role=employer }
 *               companySize: { type: string, description: Required when role=employer }
 *               industry: { type: string, description: Required when role=employer }
 *     responses:
 *       201:
 *         description: Account created and logged in
 *       401:
 *         description: Invalid or expired pendingToken
 */
const googleCompleteRegistration = async (req, res) => {
  const { pendingToken, role, phone, location, companyName, companySize, industry } = req.body;
  if (!pendingToken || !role || !phone || !location?.country || !location?.city) {
    throw new BadRequestError("Please provide all the values");
  }
  if (role === "employer" && (!companyName || !companySize || !industry)) {
    throw new BadRequestError("Employer must provide companyName, companySize, and industry");
  }

  let payload;
  try {
    payload = isTokenValid(pendingToken, process.env.JWT_SECRET);
  } catch (error) {
    throw new UnAuthenticatedError("Invalid or expired sign-up session. Please start again.");
  }
  const pending = payload.googlePending;
  if (!pending?.googleId || !pending?.email) {
    throw new UnAuthenticatedError("Invalid or expired sign-up session. Please start again.");
  }

  const alreadyExists = await User.findOne({ $or: [{ googleId: pending.googleId }, { email: pending.email }] });
  if (alreadyExists) {
    throw new BadRequestError("An account already exists for this Google account");
  }

  const user = await User.create({
    name: pending.name || "User",
    lastName: pending.lastName || "lastName",
    email: pending.email,
    googleId: pending.googleId,
    authProvider: "google",
    isVerified: true, // Google already proved the email
    role,
    phone,
    location,
    ...(role === "employer" && { companyName, companySize, industry }),
  });

  const userAgent = req.headers["user-agent"] || "unknown";
  const tokenUser = await issueSession({ res, user, ip: req.ip, userAgent });
  res.status(StatusCodes.CREATED).json({ tokenUser });
};

export { googleAuth, googleCompleteRegistration };
