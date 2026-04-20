const sgMail = require('@sendgrid/mail');
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

function emailTemplate(title, color, body) {
  return `
  <div style="font-family:Arial;background:#f5f5f5;padding:20px;">
    <div style="max-width:600px;margin:auto;background:white;border-radius:10px;overflow:hidden;">
      
      <div style="background:${color};color:white;padding:15px;font-size:20px;font-weight:bold;">
        ${title}
      </div>

      <div style="padding:20px;">
        ${body}
      </div>

    </div>
  </div>`;
}

async function sendEmail(to, subject, htmlContent, attachments = []) {
  if (!to || !to.includes('@')) return;
  const msg = {
    to,
    from: process.env.EMAIL_USER || "srikarthikeyabikkina@gmail.com",
    subject,
    html: htmlContent,
    trackingSettings: {
      clickTracking: { enable: false, enableText: false },
      openTracking: { enable: false }
    }
  };

  if (attachments && attachments.length > 0) {
    msg.attachments = attachments;
  }

  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[MAIL SKIPPED - no key] To: ${to} | Subject: ${subject}`);
    return;
  }

  try {
    await sgMail.send(msg);
    console.log(`Email sent to ${to}`);
  } catch (err) {
    console.error("ERROR:", err.response?.body || err.message);
  }
}

module.exports = { sendEmail, emailTemplate };
