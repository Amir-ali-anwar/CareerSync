import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CareerSync API',
      version: '1.0.0',
      description: 'A comprehensive job portal API that connects talent with employers and organizations',
      contact: {
        name: 'CareerSync Team',
        email: 'support@careersync.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Development server',
      },
      {
        url: 'https://api.careersync.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
          description: 'JWT token stored in httpOnly cookie',
        },
      },
      schemas: {
        User: {
          type: 'object',
          required: ['name', 'email', 'password', 'lastName', 'location', 'role', 'phone'],
          properties: {
            _id: {
              type: 'string',
              description: 'User ID',
              example: '507f1f77bcf86cd799439011',
            },
            name: {
              type: 'string',
              description: 'User first name',
              example: 'John',
              minLength: 3,
              maxLength: 50,
            },
            lastName: {
              type: 'string',
              description: 'User last name',
              example: 'Doe',
              maxLength: 100,
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john.doe@example.com',
            },
            profileImage: {
              type: 'string',
              description: 'User profile image URL',
              example: 'https://api.dicebear.com/7.x/adventurer/svg?seed=John',
            },
            location: {
              type: 'object',
              required: ['country', 'city'],
              properties: {
                country: {
                  type: 'string',
                  description: 'User country',
                  example: 'United States',
                },
                city: {
                  type: 'string',
                  description: 'User city',
                  example: 'New York',
                },
              },
            },
            role: {
              type: 'string',
              enum: ['talent', 'employer'],
              description: 'User role',
              example: 'talent',
            },
            phone: {
              type: 'string',
              description: 'User phone number',
              example: '+1234567890',
            },
            isVerified: {
              type: 'boolean',
              description: 'Email verification status',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation date',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update date',
            },
          },
        },
        Job: {
          type: 'object',
          required: ['company', 'position', 'jobType', 'jobLocation'],
          properties: {
            _id: {
              type: 'string',
              description: 'Job ID',
              example: '507f1f77bcf86cd799439011',
            },
            company: {
              type: 'string',
              description: 'Company name',
              example: 'Tech Corp',
            },
            title: {
              type: 'string',
              description: 'Job title',
              example: 'Senior Software Engineer',
            },
            position: {
              type: 'string',
              description: 'Job position',
              example: 'Software Engineer',
            },
            jobStatus: {
              type: 'string',
              enum: ['pending', 'interview', 'declined'],
              description: 'Job status',
              example: 'pending',
            },
            jobType: {
              type: 'string',
              enum: ['full-time', 'part-time', 'internship'],
              description: 'Job type',
              example: 'full-time',
            },
            jobLocation: {
              type: 'object',
              properties: {
                country: {
                  type: 'string',
                  description: 'Job country',
                  example: 'United States',
                },
                city: {
                  type: 'string',
                  description: 'Job city',
                  example: 'San Francisco',
                },
              },
            },
            applicationDeadline: {
              type: 'string',
              format: 'date-time',
              description: 'Application deadline',
              example: '2024-12-31T23:59:59.000Z',
            },
            isClosed: {
              type: 'boolean',
              description: 'Whether job is closed for applications',
              example: false,
            },
            createdBy: {
              type: 'string',
              description: 'ID of the user who created the job',
              example: '507f1f77bcf86cd799439011',
            },
            applicants: {
              type: 'array',
              description: 'List of job applicants',
              items: {
                type: 'object',
                properties: {
                  talent: {
                    type: 'string',
                    description: 'Applicant user ID',
                  },
                  job: {
                    type: 'string',
                    description: 'Job ID',
                  },
                  status: {
                    type: 'string',
                    enum: ['pending', 'shortlisted', 'rejected'],
                    description: 'Application status',
                  },
                  appliedAt: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Application date',
                  },
                  resume: {
                    type: 'string',
                    description: 'Resume file path',
                  },
                },
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Job creation date',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update date',
            },
          },
        },
        Organization: {
          type: 'object',
          required: ['name', 'description', 'industry', 'companySize', 'hqLocation', 'hiringContactEmail', 'emailDomain'],
          properties: {
            _id: {
              type: 'string',
              description: 'Organization ID',
              example: '507f1f77bcf86cd799439011',
            },
            name: {
              type: 'string',
              description: 'Organization name',
              example: 'Tech Innovations Inc',
            },
            logo: {
              type: 'string',
              description: 'Organization logo URL',
              example: 'https://example.com/logo.png',
            },
            website: {
              type: 'string',
              format: 'uri',
              description: 'Organization website',
              example: 'https://techinnovations.com',
            },
            emailDomain: {
              type: 'string',
              description: 'Organization email domain',
              example: 'techinnovations.com',
            },
            phone: {
              type: 'string',
              description: 'Organization phone number',
              example: '+1234567890',
            },
            description: {
              type: 'string',
              description: 'Organization description',
              example: 'Leading technology company focused on innovation',
            },
            mission: {
              type: 'string',
              description: 'Organization mission statement',
              example: 'To revolutionize technology through innovation',
            },
            culture: {
              type: 'string',
              description: 'Organization culture description',
              example: 'Collaborative, innovative, and inclusive workplace',
            },
            foundedYear: {
              type: 'number',
              description: 'Year organization was founded',
              example: 2010,
            },
            industry: {
              type: 'string',
              description: 'Organization industry',
              example: 'Technology',
            },
            companySize: {
              type: 'string',
              enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
              description: 'Organization size',
              example: '51-200',
            },
            hqLocation: {
              type: 'string',
              description: 'Headquarters location',
              example: 'San Francisco, CA',
            },
            locations: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'All organization locations',
              example: ['San Francisco, CA', 'New York, NY', 'London, UK'],
            },
            organizationType: {
              type: 'string',
              enum: ['Private', 'Public', 'Non-Profit', 'Startup', 'Government', 'Other'],
              description: 'Organization type',
              example: 'Private',
            },
            hiringContactEmail: {
              type: 'string',
              format: 'email',
              description: 'Contact email for hiring',
              example: 'hiring@techinnovations.com',
            },
            careersPage: {
              type: 'string',
              format: 'uri',
              description: 'Organization careers page URL',
              example: 'https://techinnovations.com/careers',
            },
            socialLinks: {
              type: 'object',
              properties: {
                linkedin: {
                  type: 'string',
                  format: 'uri',
                  description: 'LinkedIn profile URL',
                },
                twitter: {
                  type: 'string',
                  format: 'uri',
                  description: 'Twitter profile URL',
                },
                facebook: {
                  type: 'string',
                  format: 'uri',
                  description: 'Facebook profile URL',
                },
                glassdoor: {
                  type: 'string',
                  format: 'uri',
                  description: 'Glassdoor profile URL',
                },
              },
            },
            officePhotos: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Office photos URLs',
            },
            coverImage: {
              type: 'string',
              description: 'Cover image URL',
            },
            introVideo: {
              type: 'string',
              description: 'Introduction video URL',
            },
            awards: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Organization awards',
            },
            followers: {
              type: 'array',
              description: 'Organization followers',
              items: {
                type: 'object',
                properties: {
                  user: {
                    type: 'string',
                    description: 'Follower user ID',
                  },
                  followedAt: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Follow date',
                  },
                },
              },
            },
            createdBy: {
              type: 'string',
              description: 'ID of the user who created the organization',
              example: '507f1f77bcf86cd799439011',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Organization creation date',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update date',
            },
          },
        },
        JobApplication: {
          type: 'object',
          required: ['talent', 'cv'],
          properties: {
            _id: {
              type: 'string',
              description: 'Application ID',
              example: '507f1f77bcf86cd799439011',
            },
            job: {
              type: 'string',
              description: 'Job ID',
              example: '507f1f77bcf86cd799439011',
            },
            talent: {
              type: 'string',
              description: 'Applicant user ID',
              example: '507f1f77bcf86cd799439011',
            },
            status: {
              type: 'string',
              enum: ['pending', 'under review', 'shortlisted', 'interview', 'rejected'],
              description: 'Application status',
              example: 'pending',
            },
            Jobtitle: {
              type: 'string',
              description: 'Job title',
              example: 'Senior Software Engineer',
            },
            cv: {
              type: 'string',
              description: 'CV file path',
              example: '/uploads/cvs/cv-123456.pdf',
            },
            coverLetter: {
              type: 'string',
              description: 'Cover letter text',
              example: 'I am excited to apply for this position...',
            },
            portfolio: {
              type: 'string',
              description: 'Portfolio URL',
              example: 'https://portfolio.example.com',
            },
            linkedInProfile: {
              type: 'string',
              description: 'LinkedIn profile URL',
              example: 'https://linkedin.com/in/johndoe',
            },
            skills: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Applicant skills',
              example: ['JavaScript', 'React', 'Node.js', 'MongoDB'],
            },
            experienceLevel: {
              type: 'string',
              enum: ['beginner', 'intermediate', 'expert'],
              description: 'Experience level',
              example: 'intermediate',
            },
            availability: {
              type: 'string',
              description: 'Availability information',
              example: 'Available immediately',
            },
            locationPreferences: {
              type: 'string',
              description: 'Location preferences',
              example: 'Remote or San Francisco',
            },
            references: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Professional references',
            },
            appliedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Application date',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Application creation date',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update date',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            msg: {
              type: 'string',
              description: 'Error message',
              example: 'Something went wrong',
            },
            error: {
              type: 'string',
              description: 'Error details',
              example: 'Validation failed',
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            msg: {
              type: 'string',
              description: 'Success message',
              example: 'Operation completed successfully',
            },
            success: {
              type: 'boolean',
              description: 'Success status',
              example: true,
            },
          },
        },
      },
    },
    security: [
      {
        cookieAuth: [],
      },
    ],
  },
  apis: ['./routes/*.js', './controllers/*.js'], // paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(options);

export { swaggerUi, specs };
