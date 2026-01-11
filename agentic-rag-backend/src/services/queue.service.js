import chatQueue from '../config/queue.js';
import pythonBridge from './python/bridge.js';
import cacheService from './cache.service.js';
import logger, { logQueueJob } from '../utils/logger.js';
import { QueueTimeoutError } from '../utils/errors.js';
import env from '../config/environment.js';

/**
 * Queue Service
 * 
 * Manages job queue operations:
 * - Adding jobs to queue
 * - Processing jobs with cache integration
 * - Queue statistics and monitoring
 * - Job status tracking
 * - Queue cleanup
 */
class QueueService {
    constructor() {
        this.queue = chatQueue;
        this.concurrency = env.queueConcurrency;
        this.isProcessing = false;
    }

    /**
     * Add a chat job to the queue
     * 
     * @param {Object} data - Job data
     * @param {String} data.query - User query
     * @param {String} data.userId - User identifier
     * @param {String} data.sessionId - Session identifier
     * @param {Array} data.conversationHistory - Recent messages for context
     * @param {Object} options - Job options
     * @returns {Promise<Object>} Job instance
     */
    async addJob(data, options = {}) {
        const { query, userId, sessionId, conversationHistory } = data;

        const jobData = {
            query,
            userId: userId || 'anonymous',
            sessionId: sessionId || `session-${Date.now()}`,
            conversationHistory: conversationHistory || [],
            timestamp: new Date().toISOString(),
        };

        const jobOptions = {
            priority: options.priority || 0,
            timeout: options.timeout || env.queueTimeout,
            jobId: options.jobId, // Optional custom job ID
        };

        try {
            const job = await this.queue.add(jobData, jobOptions);

            logQueueJob(job.id, 'added', {
                userId: jobData.userId,
                queryLength: query.length,
            });

            return job;
        } catch (error) {
            logger.error('Failed to add job to queue', {
                error: error.message,
                data: jobData,
            });
            throw error;
        }
    }

    /**
     * Get job status by ID
     * 
     * @param {String} jobId - Job ID
     * @returns {Promise<Object>} Job status
     */
    async getJobStatus(jobId) {
        try {
            const job = await this.queue.getJob(jobId);

            if (!job) {
                return {
                    exists: false,
                    jobId,
                };
            }

            const state = await job.getState();
            const progress = job.progress();
            const result = job.returnvalue;
            const failedReason = job.failedReason;

            return {
                exists: true,
                jobId: job.id,
                state,
                progress,
                result,
                failedReason,
                attemptsMade: job.attemptsMade,
                timestamp: job.timestamp,
                processedOn: job.processedOn,
                finishedOn: job.finishedOn,
            };
        } catch (error) {
            logger.error('Failed to get job status', {
                jobId,
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Get queue statistics
     * 
     * @returns {Promise<Object>} Queue statistics
     */
    async getQueueStats() {
        try {
            const [
                waiting,
                active,
                completed,
                failed,
                delayed,
                paused,
            ] = await Promise.all([
                this.queue.getWaitingCount(),
                this.queue.getActiveCount(),
                this.queue.getCompletedCount(),
                this.queue.getFailedCount(),
                this.queue.getDelayedCount(),
                this.queue.getPausedCount(),
            ]);

            const total = waiting + active + completed + failed + delayed;

            return {
                waiting,
                active,
                completed,
                failed,
                delayed,
                paused,
                total,
                health: this._calculateQueueHealth(waiting, active, failed),
                isProcessing: this.isProcessing,
            };
        } catch (error) {
            logger.error('Failed to get queue stats', {
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Clean up old jobs
     * 
     * @param {Number} grace - Grace period in ms (default: 1 hour)
     * @returns {Promise<Object>} Cleanup results
     */
    async cleanQueue(grace = 3600000) {
        try {
            const [completedRemoved, failedRemoved] = await Promise.all([
                this.queue.clean(grace, 'completed'),
                this.queue.clean(grace * 24, 'failed'), // Keep failed jobs longer
            ]);

            logger.info('Queue cleaned', {
                completedRemoved,
                failedRemoved,
            });

            return {
                completedRemoved,
                failedRemoved,
            };
        } catch (error) {
            logger.error('Failed to clean queue', {
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Start processing jobs
     * 
     * @param {Number} concurrency - Number of concurrent jobs
     */
    processJobs(concurrency = null) {
        if (this.isProcessing) {
            logger.warn('Queue processor already running');
            return;
        }

        const processConcurrency = concurrency || this.concurrency;

        this.queue.process(processConcurrency, async (job) => {
            return this._processJob(job);
        });

        this.isProcessing = true;

        logger.info('✓ Queue processor started', {
            concurrency: processConcurrency,
        });
    }

    /**
     * Process a single job
     * 
     * @private
     * @param {Object} job - Bull job instance
     * @returns {Promise<Object>} Job result
     */
    async _processJob(job) {
        const { query, userId, sessionId, conversationHistory } = job.data;
        const startTime = Date.now();

        try {
            logQueueJob(job.id, 'processing', { userId });

            // Update progress: Checking cache
            await job.progress(20);

            // Check cache first (only if no conversation history, as context matters)
            const cacheKey = cacheService.generateKey(query);
            const cached = (!conversationHistory || conversationHistory.length === 0)
                ? await cacheService.get(cacheKey)
                : null;

            if (cached) {
                logger.info('Cache hit for job', {
                    jobId: job.id,
                    userId,
                });

                await job.progress(100);

                return {
                    answer: cached.answer,
                    contexts: cached.contexts,
                    cached: true,
                    elapsed: Date.now() - startTime,
                    userId,
                    sessionId,
                };
            }

            // Update progress: Executing Python
            await job.progress(40);

            // Execute Python RAG pipeline with conversation history
            const result = await pythonBridge.executeQuery(query, userId, conversationHistory || []);

            // Update progress: Storing cache
            await job.progress(80);

            // Store in cache
            await cacheService.set(cacheKey, {
                answer: result.answer,
                contexts: result.contexts,
            });

            // Update progress: Complete
            await job.progress(100);

            logQueueJob(job.id, 'completed', {
                userId,
                elapsed: result.elapsed,
                cached: false,
            });

            return {
                answer: result.answer,
                contexts: result.contexts,
                cached: false,
                elapsed: Date.now() - startTime,
                userId,
                sessionId,
            };
        } catch (error) {
            logQueueJob(job.id, 'failed', {
                userId,
                error: error.message,
            });

            throw error;
        }
    }

    /**
     * Calculate queue health status
     * 
     * @private
     * @param {Number} waiting - Waiting jobs count
     * @param {Number} active - Active jobs count
     * @param {Number} failed - Failed jobs count
     * @returns {String} Health status
     */
    _calculateQueueHealth(waiting, active, failed) {
        if (failed > 10) {
            return 'unhealthy';
        }

        if (waiting > 50 || active > 10) {
            return 'degraded';
        }

        return 'healthy';
    }

    /**
     * Pause queue processing
     * 
     * @returns {Promise<void>}
     */
    async pause() {
        await this.queue.pause();
        this.isProcessing = false;
        logger.info('Queue paused');
    }

    /**
     * Resume queue processing
     * 
     * @returns {Promise<void>}
     */
    async resume() {
        await this.queue.resume();
        this.isProcessing = true;
        logger.info('Queue resumed');
    }

    /**
     * Close queue gracefully
     * 
     * @returns {Promise<void>}
     */
    async close() {
        await this.queue.close();
        this.isProcessing = false;
        logger.info('Queue closed');
    }
}

// Export singleton instance
const queueService = new QueueService();

export default queueService;
