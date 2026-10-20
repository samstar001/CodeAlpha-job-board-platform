import 'dotenv/config';
import bcrypt from 'bcrypt';
import { prisma } from '../src/lib/prisma.js';
import { createResumeService } from '../src/modules/resumes/resumes.service.js';
import { createApplicationService } from '../src/modules/applications/applications.service.js';

// Build a small valid PDF with an explicit cross-reference table and fictional resume text.
function demoPdf() {
  const stream = 'BT /F1 18 Tf 50 740 Td (Demo Candidate - Fictional Resume) Tj ET';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
  let text = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(text));
    text += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(text);
  text += `xref\n0 6\n0000000000 65535 f \n${offsets.map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(text);
}

// Seed repeatable demo records without resetting collections or changing existing passwords.
try {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo seeding disabled');
  const passwordHash = await bcrypt.hash('DemoPassword123!', 12);
  const employer = await prisma.user.upsert({ where: { email: 'employer@demo.example' }, update: {}, create: { email: 'employer@demo.example', passwordHash, role: 'EMPLOYER', employerProfile: { create: { companyName: 'Demo Engineering Ltd', location: 'Lagos, Nigeria' } } }, include: { employerProfile: true } });
  const candidate = await prisma.user.upsert({ where: { email: 'candidate@demo.example' }, update: {}, create: { email: 'candidate@demo.example', passwordHash, role: 'CANDIDATE', candidateProfile: { create: { fullName: 'Demo Candidate', headline: 'Node.js Developer' } } }, include: { candidateProfile: true } });
  if (!employer.employerProfile || !candidate.candidateProfile) throw new Error('Unexpected demo role');
  let job = await prisma.job.findFirst({ where: { employerId: employer.employerProfile.id, title: 'Demo Junior Backend Developer' } });
  job ??= await prisma.job.create({ data: { employerId: employer.employerProfile.id, title: 'Demo Junior Backend Developer', description: 'Build and maintain Node.js APIs with our fictional engineering team.', location: 'Lagos, Nigeria', employmentType: 'FULL_TIME', workMode: 'HYBRID' } });
  let resume = await prisma.resume.findFirst({ where: { candidateId: candidate.candidateProfile.id, originalName: 'demo-resume.pdf' } });
  if (!resume) {
    const buffer = demoPdf();
    resume = await createResumeService(prisma, process.env.UPLOAD_DIR || './storage/resumes').upload(candidate, { originalname: 'demo-resume.pdf', mimetype: 'application/pdf', buffer, size: buffer.length });
  }
  let application = await prisma.application.findUnique({ where: { jobId_candidateId: { jobId: job.id, candidateId: candidate.candidateProfile.id } } });
  application ??= await createApplicationService(prisma).apply(candidate, job.id, { resumeId: resume.id, coverLetter: 'Fictional demo application for the internship review.' });
  console.log('Demo ready. Newly created accounts use DemoPassword123!; existing passwords are preserved.');
  console.log('Employer: employer@demo.example | Candidate: candidate@demo.example');
  console.log(`Job: ${job.id}\nResume: ${resume.id}\nApplication: ${application.id}`);
} catch {
  console.error('Demo seed failed. Check connectivity and existing demo records.');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
