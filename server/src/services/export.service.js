import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { env } from '../config/env.js';

const REPORTS_DIR = path.resolve(env.EVIDENCE_STORAGE_PATH, 'reports');
await fs.mkdir(REPORTS_DIR, { recursive: true }).catch(() => {});

/**
 * Generate PDF report for a completed test run
 */
export const generatePdfReport = async (run, testResults, bugs, project) => {
  return new Promise((resolve, reject) => {
    try {
      const fileName = `report_${run._id}_${Date.now()}.pdf`;
      const filePath = path.join(REPORTS_DIR, fileName);
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const stream = createWriteStream(filePath);

      doc.pipe(stream);

      // Header Banner
      doc.rect(40, 40, doc.page.width - 80, 50).fill('#17271F');
      doc.fillColor('#FFFFFF').fontSize(20).text('BugSlayer Test Execution Report', 60, 55);
      doc.fontSize(10).fillColor('#A8B6A0').text('Autonomous AI Quality Engineering', 60, 75);

      doc.moveDown(4);

      // Metadata summary
      doc.fillColor('#171B18').fontSize(14).text('Executive Summary', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(10).fillColor('#333333');
      doc.text(`Project: ${project ? project.name : 'Unknown Project'}`);
      doc.text(`Target Environment: ${run.targetEnvironment?.url || 'N/A'}`);
      doc.text(`Execution Date: ${run.startedAt ? new Date(run.startedAt).toLocaleString() : 'N/A'}`);
      doc.text(`Duration: ${(run.durationMs / 1000).toFixed(2)} seconds`);
      doc.text(`Final Status: ${run.status.toUpperCase()}`);

      doc.moveDown(1);

      // Metrics Table Box
      const total = run.summary?.totalTests || 0;
      const passed = run.summary?.passedTests || 0;
      const failed = run.summary?.failedTests || 0;
      const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

      doc.rect(40, doc.y, doc.page.width - 80, 40).fill('#F5F1E8');
      doc.fillColor('#244B3C').fontSize(11).text(
        `Total Tests: ${total}   |   Passed: ${passed}   |   Failed: ${failed}   |   Pass Rate: ${passRate}%`,
        60,
        doc.y - 28
      );

      doc.moveDown(2);

      // Test Cases Executed
      doc.fillColor('#171B18').fontSize(14).text('Test Cases & Results', { underline: true });
      doc.moveDown(0.5);

      for (const res of testResults) {
        const statusColor = res.status === 'passed' ? '#2E5E4C' : '#B91C1C';
        doc.fontSize(11).fillColor(statusColor).text(`[${res.status.toUpperCase()}] TestCase ID: ${res.testCaseId}`);
        doc.fontSize(9).fillColor('#4B5563').text(`Duration: ${(res.durationMs / 1000).toFixed(2)}s | Steps: ${res.executedSteps.length}`);

        if (res.errorDetails?.message) {
          doc.fillColor('#991B1B').text(`Error: ${res.errorDetails.message.slice(0, 200)}`);
        }
        doc.moveDown(0.5);
      }

      // Detected Defects & AI Investigation
      if (bugs && bugs.length > 0) {
        doc.moveDown(1);
        doc.fillColor('#171B18').fontSize(14).text('Detected Defects & AI Root Cause Analysis', { underline: true });
        doc.moveDown(0.5);

        for (const bug of bugs) {
          doc.fontSize(11).fillColor('#DC2626').text(`Defect: ${bug.title} (${bug.severity.toUpperCase()})`);
          doc.fontSize(9).fillColor('#374151').text(`Status: ${bug.status.toUpperCase()}`);
          if (bug.aiInvestigation?.probableCause) {
            doc.fontSize(9).fillColor('#1E3E32').text(`AI Probable Cause: ${bug.aiInvestigation.probableCause}`);
          }
          doc.moveDown(0.5);
        }
      }

      // Footer
      doc.fontSize(8).fillColor('#9CA3AF').text(
        'Generated automatically by BugSlayer Autonomous Quality Engineer. Verified test evidence stored persistently.',
        40,
        doc.page.height - 40,
        { align: 'center' }
      );

      doc.end();

      stream.on('finish', () => {
        resolve({
          fileName,
          filePath,
          storageReference: `/evidence/reports/${fileName}`,
        });
      });

      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Generate CSV representation of test run results
 */
export const generateCsvReport = (run, testResults, bugs) => {
  const headers = ['ResultId', 'RunId', 'TestCaseId', 'Status', 'DurationMs', 'StepsCount', 'ErrorMessage', 'FailingLocator'];
  const rows = testResults.map((r) => [
    r._id,
    r.runId,
    r.testCaseId,
    r.status,
    r.durationMs,
    r.executedSteps.length,
    `"${(r.errorDetails?.message || '').replace(/"/g, '""')}"`,
    `"${(r.errorDetails?.failingLocator || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
};

/**
 * Generate formatted JSON representation
 */
export const generateJsonReport = (run, testResults, bugs, project) => {
  return {
    meta: {
      generatedAt: new Date().toISOString(),
      platform: 'BugSlayer v1.0',
    },
    project: {
      id: project?._id,
      name: project?.name,
    },
    run: {
      id: run._id,
      status: run.status,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      durationMs: run.durationMs,
      targetEnvironment: run.targetEnvironment,
      summary: run.summary,
    },
    results: testResults,
    defects: bugs,
  };
};
