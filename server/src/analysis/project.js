import { isTestFile } from './languages.js';

const CI_PATTERNS = [
  [/^\.github\/workflows\/[^/]+\.ya?ml$/i, 'GitHub Actions'], [/^\.gitlab-ci\.ya?ml$/i, 'GitLab CI'], [/^\.circleci\/config\.ya?ml$/i, 'CircleCI'],
  [/^azure-pipelines\.ya?ml$/i, 'Azure Pipelines'], [/^Jenkinsfile$/i, 'Jenkins'], [/^\.travis\.ya?ml$/i, 'Travis CI'], [/^bitbucket-pipelines\.ya?ml$/i, 'Bitbucket Pipelines'],
];
const TEST_DEPS = ['jest', 'vitest', 'mocha', 'jasmine', 'cypress', 'playwright', '@playwright/test', 'ava', 'tap', 'pytest', 'nose2', 'tox', 'junit', 'testng', 'rspec', 'phpunit'];

export function detectLicense(text) {
  if (!text) return null;
  const t = text.slice(0, 4000);
  const checks = [[/MIT License|Permission is hereby granted, free of charge/i, 'MIT'], [/Apache License[\s\S]{0,40}Version 2\.0/i, 'Apache-2.0'], [/GNU AFFERO GENERAL PUBLIC LICENSE/i, 'AGPL-3.0'], [/GNU LESSER GENERAL PUBLIC LICENSE/i, 'LGPL'], [/GNU GENERAL PUBLIC LICENSE[\s\S]{0,40}Version 3/i, 'GPL-3.0'], [/GNU GENERAL PUBLIC LICENSE[\s\S]{0,40}Version 2/i, 'GPL-2.0'], [/Mozilla Public License[\s\S]{0,30}2\.0/i, 'MPL-2.0'], [/Redistribution and use in source and binary forms/i, 'BSD'], [/ISC License|Permission to use, copy, modify, and\/or distribute/i, 'ISC'], [/This is free and unencumbered software released into the public domain/i, 'Unlicense']];
  return checks.find(([re]) => re.test(t))?.[1] ?? 'Unrecognised';
}

export function analyseDocs({ paths, readmeText, licenseText, meta }) {
  const find = (re) => paths.find((p) => re.test(p));
  const readmePath = find(/^readme(\.\w+)?$/i);
  const text = readmeText ?? '';
  const sections = {
    install: /^#{1,4}\s*.*\b(install|installation|getting started|setup|set up|quick ?start)\b/im.test(text),
    usage: /^#{1,4}\s*.*\b(usage|use|example|examples|how to|quick ?start|api)\b/im.test(text),
    license: /^#{1,4}\s*.*\blicen[cs]e\b/im.test(text),
    contributing: /^#{1,4}\s*.*\bcontribut/im.test(text),
  };
  const licenseFile = find(/^(license|licence|copying|unlicense)(\.\w+)?$/i);
  return {
    readme: { exists: Boolean(readmePath), path: readmePath ?? null, bytes: text.length, sections, hasBadges: /!\[[^\]]*\]\(https?:[^)]*(badge|shields)/i.test(text) },
    license: { file: licenseFile ?? null, detected: detectLicense(licenseText), github: meta?.license?.spdx_id && meta.license.spdx_id !== 'NOASSERTION' ? meta.license.spdx_id : null },
    contributing: Boolean(find(/(^|\/)contributing(\.\w+)?$/i)),
    changelog: Boolean(find(/^(changelog|changes|history|news)(\.\w+)?$/i)),
    codeOfConduct: Boolean(find(/code[_-]of[_-]conduct(\.\w+)?$/i)),
    security: Boolean(find(/(^|\/)security(\.\w+)?$/i)),
    docsFolder: paths.some((p) => /^(docs?|documentation|wiki)\//i.test(p)),
    envFilesCommitted: paths.filter((p) => /(^|\/)\.env(\.(local|production|prod|development|dev))?$/.test(p)),
  };
}

export function analyseTesting({ paths, sourceFiles, dependencyNames, hasTestScript }) {
  const testFiles = paths.filter((p) => isTestFile(p) && !/(^|\/)(node_modules|vendor)\//.test(p));
  const sourceCount = sourceFiles.filter((f) => !isTestFile(f.path)).length;
  const ciFiles = [];
  let provider = null;
  for (const p of paths) for (const [re, name] of CI_PATTERNS) if (re.test(p)) { ciFiles.push(p); provider = provider ?? name; }
  const frameworks = TEST_DEPS.filter((d) => dependencyNames.has(d));
  if (testFiles.some((p) => /_test\.go$/.test(p))) frameworks.push('go test');
  if (testFiles.some((p) => /Test\.java$/.test(p)) && !frameworks.length) frameworks.push('JUnit (by file name)');
  return {
    testFiles: testFiles.length, sourceFiles: sourceCount, ratio: sourceCount ? Math.round((testFiles.length / sourceCount) * 100) / 100 : 0,
    frameworks, hasTestScript: Boolean(hasTestScript), ci: { provider, files: ciFiles.slice(0, 5), present: ciFiles.length > 0 },
    exampleTests: testFiles.slice(0, 5),
  };
}
