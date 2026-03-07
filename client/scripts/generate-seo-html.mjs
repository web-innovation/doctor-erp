import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const distRoot = path.resolve('dist');
const baseHtmlPath = path.join(distRoot, 'index.html');

const pages = [
  {
    route: '/',
    title: 'Best Clinical Software in Chandigarh | Docsy ERP',
    description:
      'Docsy ERP is the best medical software for doctors in Chandigarh. Smart HIMS system for hospitals with EMR, billing, appointments & patient records.',
    keywords: [
      'Best Clinic Management Software India',
      'Best Cloud-Based Clinic Management Software in India',
      'Best Medical Software for Doctors',
      'Best Clinic Management Software For Small Clinics',
      'Best clinic management software India',
      'Best clinic management software providers',
      'best hospital management software in india',
      'Best clinical software in chandigarh',
      'Best Hospital Software for Chandigarh',
      'Best HIMS Software in Chandigarh For Your Hospital',
      'Clinic Management Software free',
      'Clinic Management System Software Dealers in Chandigarh',
    ],
  },
  {
    route: '/features/patient-management-system-for-clinics',
    title: 'Patient Management System for Clinics | Docsy ERP',
    description:
      'Best clinic patient management software in Chandigarh by Docsy ERP. Easy doctor patient management system for hospitals & clinics in Tricity.',
    keywords: [
      'clinic patient management software in chandigarh',
      'Patient management system for clinics',
      'Patient Management System for Chandigarh',
      'Hospital Management Software in Chandigarh Metro',
      'Patient Management software company chandigarh',
      'Doctor Patient Management System in Tricity',
    ],
  },
  {
    route: '/features/pharmacy-management-software-tricity',
    title: 'Pharmacy Management Software Tricity | Docsy ERP',
    description:
      'Docsy ERP Pharmacy Billing Software for medical stores. Complete pharmacy management software with stock, GST billing & reports.',
    keywords: [
      'pharmacy management software tricity',
      'Pharmacy billing software',
      'Pharmacy Management Software',
    ],
  },
  {
    route: '/features/smart-prescription-software-for-doctors',
    title: 'Best Digital Prescription Software for Physicians | Docsy ERP',
    description:
      'Docsy ERP smart prescription software for doctors with digital prescription system and cloud pharmacy software for clinics.',
    keywords: [
      'smart prescription software for doctors',
      'Best Digital Prescription Software for Physicians',
      'Cloud pharmacy software for clinic',
      'Digital prescription software',
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

    if (page.route === '/') {
      await writeFile(baseHtmlPath, html, 'utf8');
      continue;
    }

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
