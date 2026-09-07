export type CompanySize = "1-10" | "11-50" | "51-200" | "201-500" | "501-1000" | "1000+";
export type OrganizationType =
  | "Private"
  | "Public"
  | "Non-Profit"
  | "Startup"
  | "Government"
  | "Other";

export interface SocialLinks {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  glassdoor?: string;
}

export interface OrganizationFollower {
  user: string;
  followedAt: string;
}

/** Display shape - what the API actually returns. */
export interface Organization {
  _id: string;
  name: string;
  logo?: string;
  website?: string;
  emailDomain: string;
  phone?: string;
  description: string;
  mission?: string;
  culture?: string;
  foundedYear?: number;
  industry: string;
  companySize: CompanySize;
  hqLocation: string;
  locations?: string[];
  organizationType?: OrganizationType;
  hiringContactEmail: string;
  careersPage?: string;
  socialLinks?: SocialLinks;
  officePhotos?: string[];
  coverImage?: string;
  introVideo?: string;
  awards?: string[];
  followers?: OrganizationFollower[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Create/update request shape - deliberately different from the display shape
 * (headquarters:{city,country} + about, vs. stored hqLocation string). */
export interface OrganizationFormPayload {
  name: string;
  description: string;
  industry: string;
  companySize: CompanySize;
  headquarters: {
    city: string;
    country: string;
  };
  about: string;
  hiringContactEmail: string;
  emailDomain: string;
  website?: string;
  phone?: string;
  mission?: string;
  culture?: string;
  foundedYear?: number;
  organizationType?: OrganizationType;
  careersPage?: string;
  socialLinks?: SocialLinks;
  locations?: string[];
  officePhotos?: string[];
  coverImage?: string;
  introVideo?: string;
  awards?: string[];
  logo?: string;
}

export interface OrganizationListResponse {
  organizationListing: Organization[];
  OrganizationCount: number;
}

export interface PublicOrganizationListResponse {
  TotalOrganizations: number;
  allOrganizations: Organization[];
}
