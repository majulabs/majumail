/**
 * Email Template System for MajuMail
 * 
 * Creates beautiful, modern HTML emails matching RechnungsAPI branding:
 * - Clean, professional design
 * - Modern typography (system fonts for email compatibility)
 * - Blue accent color (#0066FF) matching the website
 * - Logo integration
 * - Mobile-responsive layout
 */

// Brand colors extracted from rechnungs-api.de
const BRAND = {
  // Primary blue (used for links, accents)
  primaryColor: '#0066FF',
  primaryHover: '#0052CC',
  
  // Text colors
  textPrimary: '#1a1a1a',
  textSecondary: '#666666',
  textMuted: '#888888',
  
  // Background colors
  bgWhite: '#ffffff',
  bgLight: '#f8fafc',
  bgFooter: '#f1f5f9',
  
  // Border colors
  borderLight: '#e2e8f0',
  borderMedium: '#cbd5e1',
  
  // Font stack (email-safe)
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
};

// Base64-encoded logo SVG will be embedded inline
// The logo should be uploaded to a public URL for emails, but we'll also include inline option
const LOGO_URL = 'https://www.rechnungs-api.de/_next/static/media/logo.495729bc.svg';

interface EmailTemplateOptions {
  /** The plain text body content */
  body: string;
  /** Optional sender name for the signature */
  senderName?: string;
  /** Optional sender title/role */
  senderTitle?: string;
  /** Include company footer with links */
  includeFooter?: boolean;
  /** Custom logo URL (defaults to RechnungsAPI logo) */
  logoUrl?: string;
  /** Whether to convert line breaks to <br> tags */
  preserveLineBreaks?: boolean;
}

/**
 * Escapes HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char]);
}

/**
 * Converts plain text to HTML with proper formatting
 * - Preserves line breaks
 * - Converts URLs to clickable links
 * - Preserves paragraphs
 */
function textToHtml(text: string): string {
  let html = escapeHtml(text);
  
  // Convert URLs to clickable links
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  html = html.replace(urlRegex, `<a href="$1" style="color: ${BRAND.primaryColor}; text-decoration: none;">$1</a>`);
  
  // Convert email addresses to mailto links
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  html = html.replace(emailRegex, `<a href="mailto:$1" style="color: ${BRAND.primaryColor}; text-decoration: none;">$1</a>`);
  
  // Convert double line breaks to paragraph breaks
  html = html.replace(/\n\n+/g, '</p><p style="margin: 0 0 16px 0;">');
  
  // Convert single line breaks to <br>
  html = html.replace(/\n/g, '<br>');
  
  // Wrap in paragraph
  html = `<p style="margin: 0 0 16px 0;">${html}</p>`;
  
  // Clean up empty paragraphs
  html = html.replace(/<p style="[^"]*"><\/p>/g, '');
  
  return html;
}

/**
 * Generates the inline logo SVG for email embedding
 * This SVG matches the RechnungsAPI logo style
 */
function getInlineLogo(): string {
  // Modern invoice/document icon that represents RechnungsAPI
  // This is a clean, simple logo that works well in emails
  return `
    <svg width="140" height="32" viewBox="0 0 140 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Document icon -->
      <rect x="2" y="2" width="20" height="28" rx="2" stroke="${BRAND.primaryColor}" stroke-width="2" fill="none"/>
      <line x1="7" y1="10" x2="17" y2="10" stroke="${BRAND.primaryColor}" stroke-width="2" stroke-linecap="round"/>
      <line x1="7" y1="16" x2="17" y2="16" stroke="${BRAND.primaryColor}" stroke-width="2" stroke-linecap="round"/>
      <line x1="7" y1="22" x2="13" y2="22" stroke="${BRAND.primaryColor}" stroke-width="2" stroke-linecap="round"/>
      <!-- Text: RechnungsAPI -->
      <text x="30" y="22" font-family="${BRAND.fontFamily}" font-size="14" font-weight="600" fill="${BRAND.textPrimary}">RechnungsAPI</text>
    </svg>
  `;
}

/**
 * Creates a branded HTML email template
 */
export function createEmailTemplate(options: EmailTemplateOptions): string {
  const {
    body,
    senderName,
    senderTitle,
    includeFooter = true,
    logoUrl = LOGO_URL,
    preserveLineBreaks = true,
  } = options;

  const htmlBody = preserveLineBreaks ? textToHtml(body) : body;
  
  // Build signature block if sender info provided
  let signatureHtml = '';
  if (senderName) {
    signatureHtml = `
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid ${BRAND.borderLight};">
        <p style="margin: 0; color: ${BRAND.textPrimary}; font-weight: 500;">${escapeHtml(senderName)}</p>
        ${senderTitle ? `<p style="margin: 4px 0 0 0; color: ${BRAND.textSecondary}; font-size: 14px;">${escapeHtml(senderTitle)}</p>` : ''}
      </div>
    `;
  }

  // Footer with company info
  const footerHtml = includeFooter ? `
    <div style="margin-top: 48px; padding: 24px; background-color: ${BRAND.bgFooter}; border-radius: 8px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding-bottom: 16px;">
            <img src="${logoUrl}" alt="RechnungsAPI" height="24" style="height: 24px; display: block;" onerror="this.style.display='none'">
          </td>
        </tr>
        <tr>
          <td style="color: ${BRAND.textMuted}; font-size: 13px; line-height: 1.5;">
            <p style="margin: 0 0 8px 0;">RechnungsAPI – Einfache API-Lösung für deutsche Rechnungen und E-Rechnungen.</p>
            <p style="margin: 0;">
              <a href="https://www.rechnungs-api.de" style="color: ${BRAND.primaryColor}; text-decoration: none;">Website</a>
              &nbsp;·&nbsp;
              <a href="https://www.rechnungs-api.de/docs" style="color: ${BRAND.primaryColor}; text-decoration: none;">Dokumentation</a>
              &nbsp;·&nbsp;
              <a href="https://www.rechnungs-api.de/pricing" style="color: ${BRAND.primaryColor}; text-decoration: none;">Preise</a>
            </p>
          </td>
        </tr>
      </table>
    </div>
  ` : '';

  // Complete HTML email template
  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Email</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    /* Reset styles */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    
    /* iOS blue links */
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
    
    /* Gmail blue links */
    u + #body a { color: inherit; text-decoration: none; font-size: inherit; font-family: inherit; font-weight: inherit; line-height: inherit; }
    
    /* Samsung Mail blue links */
    #MessageViewBody a { color: inherit; text-decoration: none; font-size: inherit; font-family: inherit; font-weight: inherit; line-height: inherit; }
    
    /* Responsive styles */
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .content-padding { padding: 24px 20px !important; }
      .mobile-full-width { width: 100% !important; display: block !important; }
    }
  </style>
</head>
<body id="body" style="margin: 0; padding: 0; word-spacing: normal; background-color: ${BRAND.bgLight};">
  <!-- Preview text (hidden) -->
  <div style="display: none; font-size: 1px; color: ${BRAND.bgLight}; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${escapeHtml(body.substring(0, 150))}...
  </div>

  <!-- Email wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${BRAND.bgLight};">
    <tr>
      <td style="padding: 40px 20px;">
        
        <!-- Email container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center" class="email-container" style="max-width: 600px; width: 100%; background-color: ${BRAND.bgWhite}; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);">
          
          <!-- Header with logo -->
          <tr>
            <td style="padding: 32px 40px 24px 40px; border-bottom: 1px solid ${BRAND.borderLight};" class="content-padding">
              <a href="https://www.rechnungs-api.de" style="text-decoration: none;">
                <img src="${logoUrl}" alt="RechnungsAPI" height="28" style="height: 28px; display: block;" onerror="this.style.display='none'">
              </a>
            </td>
          </tr>
          
          <!-- Email body -->
          <tr>
            <td style="padding: 40px; font-family: ${BRAND.fontFamily}; font-size: 16px; line-height: 1.6; color: ${BRAND.textPrimary};" class="content-padding">
              ${htmlBody}
              ${signatureHtml}
            </td>
          </tr>
          
          <!-- Footer -->
          ${includeFooter ? `
          <tr>
            <td style="padding: 0 40px 40px 40px;" class="content-padding">
              ${footerHtml}
            </td>
          </tr>
          ` : ''}
          
        </table>
        <!-- End email container -->
        
        <!-- Email footer text -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center" class="email-container" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="padding: 24px 40px; text-align: center; font-family: ${BRAND.fontFamily}; font-size: 12px; color: ${BRAND.textMuted};">
              <p style="margin: 0;">
                © ${new Date().getFullYear()} RechnungsAPI. Alle Rechte vorbehalten.
              </p>
              <p style="margin: 8px 0 0 0;">
                Diese E-Mail wurde von <a href="https://www.rechnungs-api.de" style="color: ${BRAND.primaryColor}; text-decoration: none;">RechnungsAPI</a> gesendet.
              </p>
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Creates a simple, minimal email template (no branding)
 * Useful for replies where heavy branding may be inappropriate
 */
export function createSimpleEmailTemplate(body: string): string {
  const htmlBody = textToHtml(body);
  
  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; font-family: ${BRAND.fontFamily}; font-size: 16px; line-height: 1.6; color: ${BRAND.textPrimary};">
  ${htmlBody}
</body>
</html>
  `.trim();
}

/**
 * Type for template selection
 */
export type EmailTemplateType = 'branded' | 'simple' | 'none';

/**
 * Generates HTML based on template type
 */
export function generateEmailHtml(
  body: string,
  templateType: EmailTemplateType = 'branded',
  options: Partial<EmailTemplateOptions> = {}
): string | undefined {
  switch (templateType) {
    case 'branded':
      return createEmailTemplate({ body, ...options });
    case 'simple':
      return createSimpleEmailTemplate(body);
    case 'none':
    default:
      return undefined;
  }
}

export { BRAND };
