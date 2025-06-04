import OrganizationModal from "../models/OrganizationModal.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError, NotFoundError } from "../errors/index.js";
import { checkPermissions } from "../middlewares/permissions.js";
import validator from "validator";
import mongoose from "mongoose";

const MAX_ORGS_PER_USER = 4;
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

export const getOrganizationAnalytics = async (req, res) => {};

// Public controllers
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
