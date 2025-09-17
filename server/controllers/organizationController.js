import OrganizationModal from "../models/OrganizationModal.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError, NotFoundError } from "../errors/index.js";
import { checkPermissions } from "../middlewares/permissions.js";
import validator from "validator";
import mongoose from "mongoose";

const MAX_ORGS_PER_USER = 4;

/**
 * @swagger
 * /api/v1/organization:
 *   post:
 *     summary: Create a new organization
 *     tags: [Organizations]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - industry
 *               - companySize
 *               - headquarters
 *               - about
 *               - hiringContactEmail
 *               - emailDomain
 *             properties:
 *               name:
 *                 type: string
 *                 description: Organization name
 *                 example: Tech Innovations Inc
 *               description:
 *                 type: string
 *                 description: Organization description
 *                 example: Leading technology company focused on innovation
 *               industry:
 *                 type: string
 *                 description: Organization industry
 *                 example: Technology
 *               companySize:
 *                 type: string
 *                 enum: [1-10, 11-50, 51-200, 201-500, 501-1000, 1000+]
 *                 description: Organization size
 *                 example: 51-200
 *               headquarters:
 *                 type: object
 *                 required:
 *                   - city
 *                   - country
 *                 properties:
 *                   city:
 *                     type: string
 *                     description: Headquarters city
 *                     example: San Francisco
 *                   country:
 *                     type: string
 *                     description: Headquarters country
 *                     example: United States
 *               about:
 *                 type: string
 *                 description: About the organization
 *                 example: We are a leading technology company...
 *               website:
 *                 type: string
 *                 format: uri
 *                 description: Organization website
 *                 example: https://techinnovations.com
 *               emailDomain:
 *                 type: string
 *                 description: Organization email domain
 *                 example: techinnovations.com
 *               hiringContactEmail:
 *                 type: string
 *                 format: email
 *                 description: Contact email for hiring
 *                 example: hiring@techinnovations.com
 *               phone:
 *                 type: string
 *                 description: Organization phone number
 *                 example: +1234567890
 *               mission:
 *                 type: string
 *                 description: Organization mission statement
 *                 example: To revolutionize technology through innovation
 *               culture:
 *                 type: string
 *                 description: Organization culture description
 *                 example: Collaborative, innovative, and inclusive workplace
 *               foundedYear:
 *                 type: number
 *                 description: Year organization was founded
 *                 example: 2010
 *               organizationType:
 *                 type: string
 *                 enum: [Private, Public, Non-Profit, Startup, Government, Other]
 *                 description: Organization type
 *                 example: Private
 *               careersPage:
 *                 type: string
 *                 format: uri
 *                 description: Organization careers page URL
 *                 example: https://techinnovations.com/careers
 *               socialLinks:
 *                 type: object
 *                 properties:
 *                   linkedin:
 *                     type: string
 *                     format: uri
 *                     description: LinkedIn profile URL
 *                   twitter:
 *                     type: string
 *                     format: uri
 *                     description: Twitter profile URL
 *                   facebook:
 *                     type: string
 *                     format: uri
 *                     description: Facebook profile URL
 *                   glassdoor:
 *                     type: string
 *                     format: uri
 *                     description: Glassdoor profile URL
 *               locations:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: All organization locations
 *                 example: ["San Francisco, CA", "New York, NY"]
 *               officePhotos:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Office photos URLs
 *               coverImage:
 *                 type: string
 *                 description: Cover image URL
 *               introVideo:
 *                 type: string
 *                 description: Introduction video URL
 *               awards:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Organization awards
 *     responses:
 *       201:
 *         description: Organization created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: Organization created successfully
 *                 newOrganization:
 *                   $ref: '#/components/schemas/Organization'
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
 *       403:
 *         description: Forbidden - maximum organizations limit reached
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const createOrganization = async (req, res) => {
  const {
    name,
    description,
    industry,
    companySize,
    headquarters,
    about,
    website,
    socialLinks,
    hiringContactEmail,
    emailDomain,
    logo,
    phone,
    mission,
    culture,
    foundedYear,
    locations,
    organizationType,
    careersPage,
    officePhotos,
    coverImage,
    introVideo,
    awards,
  } = req.body;

  if (
    !name?.trim() ||
    !description?.trim() ||
    !industry?.trim() ||
    !companySize?.trim() ||
    !headquarters?.city?.trim() ||
    !headquarters?.country?.trim() ||
    !about?.trim() ||
    !hiringContactEmail?.trim() ||
    !emailDomain?.trim()
  ) {
    throw new BadRequestError(
      "All required organization fields must be provided"
    );
  }

  if (website && !validator.isURL(website)) {
    throw new BadRequestError("Invalid website URL");
  }
  if (socialLinks) {
    if (socialLinks.linkedin && !validator.isURL(socialLinks.linkedin)) {
      throw new BadRequestError("Invalid LinkedIn URL");
    }
    if (socialLinks.twitter && !validator.isURL(socialLinks.twitter)) {
      throw new BadRequestError("Invalid Twitter URL");
    }
  }

  const orgCount = await OrganizationModal.countDocuments({
    createdBy: req.user.userId,
  });

  if (orgCount >= MAX_ORGS_PER_USER) {
    return res.status(StatusCodes.FORBIDDEN).json({
      error: "You’ve reached the maximum number of organizations allowed.",
    });
  }

  const newOrganization = await OrganizationModal.create({
    name: name.trim(),
    logo,
    website,
    emailDomain: emailDomain?.trim(),
    phone,
    description: description.trim(),
    mission,
    culture,
    foundedYear,
    industry: industry.trim(),
    companySize,
    hqLocation: `${headquarters?.city?.trim() || ""}, ${
      headquarters?.country?.trim() || ""
    }`,
    locations,
    organizationType,
    hiringContactEmail: hiringContactEmail?.trim(),
    careersPage,
    socialLinks,
    officePhotos,
    coverImage,
    introVideo,
    awards,
    createdBy: req.user.userId,
  });

  return res
    .status(StatusCodes.CREATED)
    .json({ msg: "Organization created successfully", newOrganization });
};

/**
 * @swagger
 * /api/v1/organization:
 *   get:
 *     summary: Get all organizations for the authenticated user
 *     tags: [Organizations]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Organizations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 organizationListing:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Organization'
 *                 OrganizationCount:
 *                   type: integer
 *                   description: Total number of organizations
 *                   example: 3
 *       401:
 *         description: Unauthorized - invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const getAllOrganizations = async (req, res) => {
  const organizationListing = await OrganizationModal.find({
    createdBy: req.user.userId,
  });
  checkPermissions(req.user, organizationListing[0].createdBy.toString());
  return res.status(StatusCodes.OK).json({
    organizationListing,
    OrganizationCount: organizationListing.length,
  });
};

/**
 * @swagger
 * /api/v1/organization/{id}:
 *   patch:
 *     summary: Update an organization
 *     tags: [Organizations]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *         example: 507f1f77bcf86cd799439011
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Organization name
 *                 example: Tech Innovations Inc
 *               description:
 *                 type: string
 *                 description: Organization description
 *                 example: Leading technology company focused on innovation
 *               industry:
 *                 type: string
 *                 description: Organization industry
 *                 example: Technology
 *               companySize:
 *                 type: string
 *                 enum: [1-10, 11-50, 51-200, 201-500, 501-1000, 1000+]
 *                 description: Organization size
 *                 example: 51-200
 *               website:
 *                 type: string
 *                 format: uri
 *                 description: Organization website
 *                 example: https://techinnovations.com
 *               emailDomain:
 *                 type: string
 *                 description: Organization email domain
 *                 example: techinnovations.com
 *               hiringContactEmail:
 *                 type: string
 *                 format: email
 *                 description: Contact email for hiring
 *                 example: hiring@techinnovations.com
 *               phone:
 *                 type: string
 *                 description: Organization phone number
 *                 example: +1234567890
 *               mission:
 *                 type: string
 *                 description: Organization mission statement
 *                 example: To revolutionize technology through innovation
 *               culture:
 *                 type: string
 *                 description: Organization culture description
 *                 example: Collaborative, innovative, and inclusive workplace
 *               foundedYear:
 *                 type: number
 *                 description: Year organization was founded
 *                 example: 2010
 *               organizationType:
 *                 type: string
 *                 enum: [Private, Public, Non-Profit, Startup, Government, Other]
 *                 description: Organization type
 *                 example: Private
 *               careersPage:
 *                 type: string
 *                 format: uri
 *                 description: Organization careers page URL
 *                 example: https://techinnovations.com/careers
 *               socialLinks:
 *                 type: object
 *                 properties:
 *                   linkedin:
 *                     type: string
 *                     format: uri
 *                     description: LinkedIn profile URL
 *                   twitter:
 *                     type: string
 *                     format: uri
 *                     description: Twitter profile URL
 *                   facebook:
 *                     type: string
 *                     format: uri
 *                     description: Facebook profile URL
 *                   glassdoor:
 *                     type: string
 *                     format: uri
 *                     description: Glassdoor profile URL
 *               locations:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: All organization locations
 *                 example: ["San Francisco, CA", "New York, NY"]
 *               officePhotos:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Office photos URLs
 *               coverImage:
 *                 type: string
 *                 description: Cover image URL
 *               introVideo:
 *                 type: string
 *                 description: Introduction video URL
 *               awards:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Organization awards
 *     responses:
 *       200:
 *         description: Organization updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: Organization updated successfully
 *                 organization:
 *                   $ref: '#/components/schemas/Organization'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - invalid token or insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Organization not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const updateOrganization = async (req, res) => {
  const { id: organizationId } = req.params;
  const updateData = req.body;
  const currentOrganization = await OrganizationModal.findOne({
    _id: organizationId,
  });
  if (!currentOrganization) {
    throw new NotFoundError("Organization not found");
  }
  checkPermissions(req.user, currentOrganization.createdBy.toString());
  delete req.body.createdBy;
  const updatedOrganization = await OrganizationModal.findByIdAndUpdate(
    organizationId,
    updateData,
    { new: true, runValidators: true }
  );
  return res.status(StatusCodes.OK).json({
    msg: "Organization updated successfully",
    organization: updatedOrganization,
  });
};

/**
 * @swagger
 * /api/v1/organization/{id}:
 *   delete:
 *     summary: Delete an organization
 *     tags: [Organizations]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Organization deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: Organization deleted successfully
 *       401:
 *         description: Unauthorized - invalid token or insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Organization not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const deleteOrganization = async (req, res) => {
  const { id: organizationId } = req.params;
  const organization = await OrganizationModal.findById(organizationId);
  if (!organization) {
    throw new NotFoundError("Organization not found");
  }
  checkPermissions(req.user, organization.createdBy);
  await organization.remove();
  res.status(StatusCodes.OK).json({ msg: "Organization deleted successfully" });
};

/**
 * @swagger
 * /api/v1/organization/{id}/follow:
 *   post:
 *     summary: Follow an organization
 *     tags: [Organizations]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Organization followed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Now following organization
 *       404:
 *         description: Organization not found
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
export const followOrganization = async (req, res) => {
  const organizationId = req.params.id;
  const userId = req.user.userId;
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const organization = await OrganizationModal.findById(organizationId);
  if (!organization) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Organiation not found" });
  }
  const alreadyFollowing = organization?.followers?.some(
    (f) => f.user.toString() === userId
  );

  if (alreadyFollowing) {
    return res.status(StatusCodes.OK).json({ message: "Already following" });
  }
  await OrganizationModal.findByIdAndUpdate(
    organizationId,
    { $push: { followers: { user: userObjectId, followedAt: new Date() } } },
    { new: true }
  );

  return res
    .status(StatusCodes.OK)
    .json({ message: "Now following organization" });
};

/**
 * @swagger
 * /api/v1/organization/{id}/followers:
 *   get:
 *     summary: Get organization followers
 *     tags: [Organizations]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Organization followers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 followers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       user:
 *                         type: string
 *                         description: Follower user ID
 *                         example: 507f1f77bcf86cd799439011
 *                       followedAt:
 *                         type: string
 *                         format: date-time
 *                         description: Follow date
 *       404:
 *         description: Organization not found
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
export const getOrganizationFollowers = async (req, res) => {
  const organizationId = req.params.id;
  const organization = await OrganizationModal.findById(organizationId).select(
    "followers -_id"
  );
  if (!organization) {
    throw new NotFoundError("Organization not found");
  }
  const followers = organization.followers || [];
  return res.status(StatusCodes.OK).json({ followers });
};

/**
 * @swagger
 * /api/v1/organization/{id}/check-following:
 *   get:
 *     summary: Check if user is following an organization
 *     tags: [Organizations]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Follow status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isFollowing:
 *                   type: boolean
 *                   description: Whether user is following the organization
 *                   example: true
 *       404:
 *         description: Organization not found
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
export const checkIfFollowingOrganization = async (req, res) => {
  const userId = req.user.userId;
  const organizationId = req.params.id;
  const organization = await OrganizationModal.findById(organizationId);
  if (!organization) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Organiation not found" });
  }
  const isFollowing = organization.followers?.some(
    (f) => f.user.toString() === userId
  );
  return res.status(StatusCodes.OK).json({ isFollowing });
};

/**
 * @swagger
 * /api/v1/organization/analytics:
 *   get:
 *     summary: Get organization analytics
 *     tags: [Organizations]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Organization analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 analytics:
 *                   type: object
 *                   description: Organization analytics data
 */
export const getOrganizationAnalytics = async (req, res) => {};

/**
 * @swagger
 * /api/v1/organization/public:
 *   get:
 *     summary: Get all public organizations
 *     tags: [Organizations]
 *     responses:
 *       200:
 *         description: Public organizations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 TotalOrganizations:
 *                   type: integer
 *                   description: Total number of organizations
 *                   example: 50
 *                 allOrganizations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Organization'
 */
export const getAllPublicOrganizations = async (req, res) => {
  const allOrganizations = await OrganizationModal.find({});

  return res
    .status(StatusCodes.OK)
    .json({ TotalOrganizations: allOrganizations.length, allOrganizations });
};

export const getSinglePublicOrganization = async (req, res) => {
  const { id: organizationId } = req.params;

  const SingleOrganization = await OrganizationModal.findById(organizationId);

  return res.status(StatusCodes.OK).json({ SingleOrganization });
};

export const getPublicFollowerCount = async (req, res) => {
   const { id: organizationId } = req.params;
  const organization = await OrganizationModal.findById(organizationId).select(
    "followers -_id"
  );
   if (!organization) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Organiation not found" });
  }
  console.log(organization)
};
