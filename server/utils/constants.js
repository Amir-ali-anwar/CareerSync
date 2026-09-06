export const JOB_STATUS = {
    PENDING: 'pending',
    INTERVIEW: 'interview',
    DECLINED: 'declined',
  };
  
  export const JOB_TYPE = {
    FULL_TIME: 'full-time',
    PART_TIME: 'part-time',
    INTERNSHIP: 'internship',
  };

  export const WORK_MODE = {
    REMOTE: 'remote',
    HYBRID: 'hybrid',
    ONSITE: 'onsite',
  };

  // Shared by every AI-processing pipeline's status field: JobApplication.
  // resumeProcessingStatus + CandidateProfile.processingStatus (kept in sync by
  // services/resume/resumeProcessingService.js), and Job.intelligenceProcessingStatus +
  // JobProfile.processingStatus (kept in sync by services/job/jobIntelligenceService.js).
  export const AI_PROCESSING_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
  };
  
  export const JOB_SORT_BY = {
    NEWEST_FIRST: 'newest',
    OLDEST_FIRST: 'oldest',
    ASCENDING: 'a-z',
    DESCENDING: 'z-a',
    DISTANCE_ASC: 'distance-asc',
    DISTANCE_DESC: 'distance-desc',
  };
  