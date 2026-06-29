export const CONTENT_GENERATION_JOB_STATES = [
  'queued',
  'running',
  'validation_failed',
  'awaiting_review',
  'completed',
  'failed',
  'cancelled',
] as const

export const GENERATED_DOCUMENT_STATUSES = [
  'draft',
  'generating',
  'validation_failed',
  'ready_for_review',
  'approved',
  'published',
  'failed',
  'archived',
] as const

export type ContentGenerationJobState = (typeof CONTENT_GENERATION_JOB_STATES)[number]
export type GeneratedDocumentStatus = (typeof GENERATED_DOCUMENT_STATUSES)[number]

export interface GenerationWorkflowContext {
  validationPassed?: boolean
  reviewerId?: string | null
  outputResourceApproved?: boolean
  storageObjectKey?: string | null
  htmlObjectKey?: string | null
  errorMessage?: string | null
}

export interface GenerationWorkflowDecision {
  allowed: boolean
  errors: string[]
}

const ALLOWED_TRANSITIONS: Record<ContentGenerationJobState, ContentGenerationJobState[]> = {
  queued: ['queued', 'running', 'cancelled'],
  running: ['queued', 'running', 'validation_failed', 'awaiting_review', 'failed', 'cancelled'],
  validation_failed: ['validation_failed', 'queued', 'running', 'failed', 'cancelled'],
  awaiting_review: ['awaiting_review', 'completed', 'validation_failed', 'failed', 'cancelled'],
  completed: ['completed'],
  failed: ['failed'],
  cancelled: ['cancelled'],
}

export function validateGenerationJobTransition(
  from: ContentGenerationJobState,
  to: ContentGenerationJobState,
  context: GenerationWorkflowContext = {},
): GenerationWorkflowDecision {
  const errors: string[] = []
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    errors.push(`Cannot transition content generation job from ${from} to ${to}.`)
  }

  if (to === 'awaiting_review') {
    if (context.validationPassed !== true) {
      errors.push('Validation must pass before a generated document can await review.')
    }
    if (!hasReviewableArtifact(context)) {
      errors.push('A generated HTML or PDF artifact is required before reviewer handoff.')
    }
  }

  if (to === 'completed') {
    if (!context.reviewerId) {
      errors.push('Reviewer approval is required before completing a generation job.')
    }
    if (context.validationPassed !== true) {
      errors.push('A completed generation job must retain a passing validation result.')
    }
    if (!context.outputResourceApproved && !hasReviewableArtifact(context)) {
      errors.push('A completed generation job needs an approved output resource or reviewed artifact key.')
    }
  }

  if (to === 'failed' && !context.errorMessage) {
    errors.push('A failed generation job must retain an error message.')
  }

  return { allowed: errors.length === 0, errors }
}

export function generatedDocumentStatusForJobState(
  state: ContentGenerationJobState,
): GeneratedDocumentStatus {
  switch (state) {
    case 'queued':
      return 'draft'
    case 'running':
      return 'generating'
    case 'validation_failed':
      return 'validation_failed'
    case 'awaiting_review':
      return 'ready_for_review'
    case 'completed':
      return 'approved'
    case 'failed':
      return 'failed'
    case 'cancelled':
      return 'archived'
  }
}

export function hasReviewableArtifact(context: Pick<
  GenerationWorkflowContext,
  'storageObjectKey' | 'htmlObjectKey'
>): boolean {
  return Boolean(context.storageObjectKey || context.htmlObjectKey)
}
