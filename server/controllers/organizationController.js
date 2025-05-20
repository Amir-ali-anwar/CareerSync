import OrganizationModal from "../models/OrganizationModal.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError } from "../errors/index.js";
import { checkPermissions } from "../middlewares/permissions.js";
import validator from "validator";

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
    throw new Error("All required organization fields must be provided");
  }

  if (website && !validator.isURL(website)) {
    throw new Error("Invalid website URL");
  }
  if (socialLinks) {
    if (socialLinks.linkedin && !validator.isURL(socialLinks.linkedin)) {
      throw new Error("Invalid LinkedIn URL");
    }
    if (socialLinks.twitter && !validator.isURL(socialLinks.twitter)) {
      throw new Error("Invalid Twitter URL");
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
    hqLocation: `${headquarters?.city?.trim() || ""}, ${headquarters?.country?.trim() || ""}`,
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
    checkPermissions(req.user,job.createdBy)
  checkPermissions()
};
