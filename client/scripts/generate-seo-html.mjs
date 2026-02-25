import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const distRoot = path.resolve('dist');
const baseHtmlPath = path.join(distRoot, 'index.html');

const pages = [
  {
    route: '/features/patient-management-system-for-clinics',
    title: 'Patient Management System for Clinics | Docsy ERP',
    description:
      'Advanced patient health analytics software with clinic patient management and OPD management software for smart reporting, billing and workflow automation.',
    keywords: [
      'Patient Health Analytics Software',
      'Patient Management System for Clinics',
      'Clinic patient management software',
      'OPD management software',
    ],
  },
  {
    route: '/features/pharmacy-management-software-tricity',
    title: 'Pharmacy Management Software in tricity | Docsy ERP',
    description:
      'Docsy ERP delivers medical store inventory software, pharmacy billing software and cloud pharmacy software for clinic billing, stock control and reports.',
    keywords: [
      'Pharmacy Management Software in tricity',
      'Medical store inventory software',
      'Pharmacy billing software',
      'Cloud pharmacy software for clinic',
    ],
  },
  {
    route: '/features/smart-prescription-software-for-doctors',
    title: 'Smart Prescription Software for Doctors | Docsy ERP',
    description:
      'Docsy ERP clinic e-prescription system and digital prescription software for doctors in India with EMR integration for secure, paperless workflows.',
    keywords: [
      'Smart Prescription Software for Doctors',
      'Clinic e-prescription system',
      'Digital prescription software',
      'Digital prescription software for doctors',
    ],
  },
];

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function replaceTag(html, pattern, replacement) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html;
}

function upsertDescription(html, description) {
  const tag = `<meta name="description" content="${escapeHtml(description)}" />`;
  const pattern = /<meta\s+name=["']description["'][^>]*>/i;
  return replaceTag(html, pattern, tag);
}

function upsertKeywords(html, keywords) {
  const content = escapeHtml(keywords.join(', '));
  const tag = `<meta name="keywords" content="${content}" />`;
  const pattern = /<meta\s+name=["']keywords["'][^>]*>/i;
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace(/<meta\s+name=["']description["'][^>]*>/i, (m) => `${m}\n    ${tag}`);
}

function upsertTitle(html, title) {
  const safeTitle = escapeHtml(title);
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`);
}

async function main() {
  const baseHtml = await readFile(baseHtmlPath, 'utf8');
  for (const page of pages) {
    let html = baseHtml;
    html = upsertTitle(html, page.title);
    html = upsertDescription(html, page.description);
    html = upsertKeywords(html, page.keywords);

    const routeDir = page.route.replace(/^\/+/, '');
    const targetDir = path.join(distRoot, routeDir);
    const targetHtml = path.join(targetDir, 'index.html');

    await mkdir(targetDir, { recursive: true });
    await writeFile(targetHtml, html, 'utf8');
  }
}

main().catch((error) => {
  console.error('Failed to generate SEO HTML files:', error);
  process.exitCode = 1;
});
