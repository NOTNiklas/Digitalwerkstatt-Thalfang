const MAX_FIELD_LENGTH = 2000;
const REQUIRED_FIELDS = ["name", "email", "message"];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return response(405, { message: "Methode nicht erlaubt." });
  }

  let payload;

  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return response(400, { message: "Ungültige Anfrage." });
  }

  if (String(payload.website || "").trim() !== "") {
    return response(200, { message: "Anfrage erfolgreich verarbeitet." });
  }

  const validated = validatePayload(payload);
  if (!validated.valid) {
    return response(400, { message: validated.message });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const contactToEmail = process.env.CONTACT_INQUIRY_TO;
  const contactFromEmail = process.env.CONTACT_INQUIRY_FROM;

  if (!resendApiKey || !contactToEmail || !contactFromEmail) {
    return response(500, { message: "Serverkonfiguration unvollständig." });
  }

  const clean = sanitizePayload(payload);
  const subject = `Neue Anfrage über die Website${clean.company ? ` | ${clean.company}` : ""}`;
  const idempotencyKey = `contact-${Date.now()}-${clean.email.toLowerCase().replace(/[^a-z0-9_-]/g, "-")}`;

  try {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify({
        from: contactFromEmail,
        to: [contactToEmail],
        subject,
        html: buildHtml(clean),
        text: buildText(clean),
        reply_to: clean.email
      })
    });

    const resendResult = await resendResponse.json().catch(() => ({}));
    if (!resendResponse.ok) {
      return response(502, { message: "Die Anfrage konnte aktuell nicht zugestellt werden." });
    }

    return response(200, {
      message: "Anfrage erfolgreich versendet.",
      id: resendResult.id || null
    });
  } catch {
    return response(500, { message: "Beim Versand ist ein Serverfehler aufgetreten." });
  }
};

function validatePayload(payload) {
  for (const field of REQUIRED_FIELDS) {
    if (!String(payload[field] || "").trim()) {
      return { valid: false, message: "Bitte füllen Sie alle Pflichtfelder korrekt aus." };
    }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payload.email || "").trim())) {
    return { valid: false, message: "Bitte geben Sie eine gültige E-Mail-Adresse an." };
  }

  if (String(payload.message || "").trim().length < 20) {
    return { valid: false, message: "Bitte beschreiben Sie Ihr Anliegen etwas genauer." };
  }

  if (payload.privacy !== true) {
    return { valid: false, message: "Die Datenschutzerklärung muss bestätigt werden." };
  }

  for (const field of ["name", "company", "email", "phone", "message"]) {
    if (String(payload[field] || "").length > MAX_FIELD_LENGTH) {
      return { valid: false, message: "Eine Eingabe ist zu lang." };
    }
  }

  return { valid: true, message: "" };
}

function sanitizePayload(payload) {
  return {
    name: sanitizeText(payload.name),
    company: sanitizeText(payload.company),
    email: sanitizeText(payload.email),
    phone: sanitizeText(payload.phone),
    message: sanitizeText(payload.message)
  };
}

function sanitizeText(value) {
  return String(value || "").trim().slice(0, MAX_FIELD_LENGTH);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtml(data) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#1d1f24;line-height:1.6">
      <h2 style="margin:0 0 16px;font-size:24px">Neue Anfrage über die Website</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #d8d1c5;font-weight:700;width:180px">Name</td>
          <td style="padding:10px 0;border-bottom:1px solid #d8d1c5">${escapeHtml(data.name)}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #d8d1c5;font-weight:700">Unternehmen</td>
          <td style="padding:10px 0;border-bottom:1px solid #d8d1c5">${escapeHtml(data.company || "-")}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #d8d1c5;font-weight:700">E-Mail</td>
          <td style="padding:10px 0;border-bottom:1px solid #d8d1c5">${escapeHtml(data.email)}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #d8d1c5;font-weight:700">Telefon</td>
          <td style="padding:10px 0;border-bottom:1px solid #d8d1c5">${escapeHtml(data.phone || "-")}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;vertical-align:top;font-weight:700">Nachricht</td>
          <td style="padding:10px 0;white-space:pre-wrap">${escapeHtml(data.message)}</td>
        </tr>
      </table>
    </div>
  `;
}

function buildText(data) {
  return [
    "Neue Anfrage über die Website",
    "",
    `Name: ${data.name}`,
    `Unternehmen: ${data.company || "-"}`,
    `E-Mail: ${data.email}`,
    `Telefon: ${data.phone || "-"}`,
    "",
    "Nachricht:",
    data.message
  ].join("\n");
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify(body)
  };
}
