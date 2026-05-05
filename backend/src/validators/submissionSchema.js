const { z } = require('zod');

const submitProofSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  textContent: z.string().trim().max(5000).optional(),
});

const rejectSubmissionSchema = z.object({
  rejectionReason: z.string().trim().min(5, 'Reason must be at least 5 characters').max(500),
});

module.exports = { submitProofSchema, rejectSubmissionSchema };
