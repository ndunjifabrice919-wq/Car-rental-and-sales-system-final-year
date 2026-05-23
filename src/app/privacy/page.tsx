export default function PrivacyPage() {
  return (
    <div className="page" style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 className="section-title">Privacy Policy</h1>
        <p className="section-subtitle">Last updated: May 2025 · DriveEasy, Buea, Cameroon</p>
      </div>

      {[
        { title: "1. Information We Collect", content: "We collect information you provide directly: full name, email address, phone number, government-issued ID number and document image, profile photo, and payment details. We also collect usage data including pages visited, vehicles viewed, bookings made, and device/browser information." },
        { title: "2. How We Use Your Information", content: "Your information is used to: create and manage your account; verify your identity before transactions (KYC); process rental and purchase bookings; send booking confirmations, security codes (OTP), and service notifications; improve our platform features; and comply with legal obligations in Cameroon." },
        { title: "3. Identity Documents", content: "Government-issued ID documents uploaded for verification are stored in a secure, encrypted storage system (Supabase Storage). Documents are accessible only to authorised DriveEasy staff for verification purposes. We do not share your ID documents with third parties except where required by law." },
        { title: "4. Payment Information", content: "Payment transactions are processed through MTN Mobile Money, Orange Money, and Fapshi — regulated payment providers. DriveEasy does not store full payment credentials. Transaction records are retained for accounting and dispute resolution purposes." },
        { title: "5. Data Sharing", content: "We do not sell your personal data. We may share data with: vehicle owners (name and contact only, for confirmed bookings); payment processors to complete transactions; government or law enforcement agencies when legally required; and service providers who help operate our platform under strict confidentiality agreements." },
        { title: "6. Data Retention", content: "Account data is retained for as long as your account is active. You may request deletion of your account and associated data by contacting support@driveeasy.cm. Some data (transaction records) may be retained for up to 7 years for legal and accounting compliance." },
        { title: "7. Security", content: "We implement industry-standard security measures including: encrypted data storage; HTTPS/TLS for all data in transit; OTP email verification before every payment; and regular security reviews. Despite these measures, no system is 100% secure and we cannot guarantee absolute security." },
        { title: "8. Your Rights", content: "You have the right to: access the personal data we hold about you; correct inaccurate data; request deletion of your data; withdraw consent for non-essential data processing; and file a complaint with relevant data protection authorities in Cameroon." },
        { title: "9. Cookies", content: "Our platform uses essential cookies for authentication session management. We do not use advertising or third-party tracking cookies. You can control cookie settings through your browser." },
        { title: "10. Contact", content: "For privacy-related requests or questions, contact our Data Protection team at: support@driveeasy.cm. Response time: within 5 business days." },
      ].map(section => (
        <div key={section.title} style={{ marginBottom: "28px", borderBottom: "1px solid var(--navy-border)", paddingBottom: "24px" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 800, margin: "0 0 10px", color: "var(--white-soft)" }}>{section.title}</h2>
          <p style={{ color: "var(--white-muted)", fontSize: "0.88rem", lineHeight: 1.8, margin: 0 }}>{section.content}</p>
        </div>
      ))}

      <p style={{ color: "var(--white-muted)", fontSize: "0.8rem", textAlign: "center", marginTop: "12px" }}>
        DriveEasy is committed to protecting your privacy and handling your data responsibly.
      </p>
    </div>
  );
}
