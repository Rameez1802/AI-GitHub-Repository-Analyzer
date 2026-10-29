import crypto from 'node:crypto';
import { config } from './config.js';

const jobs = new Map();

export function createJob(meta = {}) {
  prune();
  const id = crypto.randomUUID();
  const job = { id, status: 'queued', stage: 'queued', label: 'Waiting to start', percent: 0, createdAt: Date.now(), result: null, internal: null, error: null, ...meta };
  jobs.set(id, job);
  return job;
}

export const getJob = (id) => jobs.get(id) ?? null;

export function prune() {
  const now = Date.now();
  for (const [id, job] of jobs) if (now - job.createdAt > config.keepAnalysesMs) jobs.delete(id);
  while (jobs.size >= config.maxStoredAnalyses) jobs.delete(jobs.keys().next().value);
}

/** The part of a job that is safe to send to the browser (no search index). */
export function publicJob(job) {
  const { id, status, stage, label, percent, createdAt, result, error, source } = job;
  return { id, status, stage, label, percent, createdAt, source, result: status === 'done' ? result : null, error };
}
