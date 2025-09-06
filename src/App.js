"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Vercel build fix notes:
// - Ensure file extensions are .js or .ts, not .jsx or .tsx, if using plain JS
// - Check for server-side code (window, document, fetch) which must be in `useEffect` or client-only code
// - Never use await fetch outside useEffect or event handlers
// - Always check for "window" or "document" existance if used

const supabase = createClient(
  'https://rbsrverouylthjdbrxgd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJic3J2ZXJvdXlsdGhqZGJyeGdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxNDQ1MTQsImV4cCI6MjA1OTcyMDUxNH0.KckvPMHcEWVHfKVNBRjLZENIsMi3uTXAsmvRXdrH74o'
);

const statusTranslations: Record<string, { de: string; en: string }> = {
  'جارى مراجعة الطلب. رجاء التحقق لاحقاً': {
    de: 'Der Antrag wird geprüft. Bitte überprüfen Sie später erneut.',
    en: 'Application under review. Please check again later.',
  },
  'وردت الموافقة، رجاء إحضار جـواز السفر والأوراق المطلوبة خلال المواعيد المحددة أو الإرسال بالبريد المسجل مع مظروف إعادة مستوفى الطوابع والعنوان': {
    de: 'Die Genehmigung ist eingegangen. Bitte bringen Sie Ihren Reisepass und die erforderlichen Unterlagen innerhalb der festgelegten Fristen oder senden Sie sie per Einschreiben mit einem ausreichend frankierten Rückumschlag und Ihrer Adresse.',
    en: 'Approval received. Please bring your passport and required documents within the specified deadlines or send them by registered mail with a stamped return envelope and your address.',
  },
  'لم ترد الموافقة': {
    de: 'Die Genehmigung wurde nicht erteilt.',
    en: 'Approval not granted.',
  },
  'مطلوب إستيفاء': {
    de: 'Ergänzende Angaben erforderlich.',
    en: 'Additional information required.',
  },
  'لم يتم إستلام طلبكم حتى الآن. رجاء التحقق من إرسال الطلب': {
    de: 'Ihr Antrag wurde noch nicht empfangen. Bitte überprüfen Sie den Versand.',
    en: 'Your application has not been received yet. Please check your submission.',
  },
};

function getAllTranslations(arabicStatus: string) {
  // If full match
  if (statusTranslations[arabicStatus]) {
    return {
      ar: arabicStatus,
      de: statusTranslations[arabicStatus].de,
      en: statusTranslations[arabicStatus].en,
    };
  }
  // If compound status (like the default "not received" message with \n)
  if (arabicStatus && arabicStatus.includes('\n')) {
    const lines = arabicStatus.split('\n');
    if (lines.length === 2 && statusTranslations[lines[0]]) {
      return {
        ar: lines[0],
        de: lines[1],
        en: statusTranslations[lines[0]].en,
      };
    }
  }
  // Fallback: Arabic only
  return {
    ar: arabicStatus,
    de: '',
    en: '',
  };
}

export default function VisaAppPage() {
  const [barcode, setBarcode] = useState<string | null>(null);
  const [trackInput, setTrackInput] = useState('');
  const [trackingStatus, setTrackingStatus] = useState<{ ar: string; de: string; en: string } | null>(null);
  const [trackingNotes, setTrackingNotes] = useState<string | null>(null);

  useEffect(() => {
    // Always client-side, so safe for Vercel
    const generateRandomBarcode = async () => {
      const { data, error } = await supabase.from('visa_requests').select('barcode');
      if (error) {
        setBarcode('0000');
        return;
      }
      const existing = new Set((data || []).map((d: any) => d.barcode));
      let code: string;
      do {
        code = Math.floor(1000 + Math.random() * 9000).toString();
      } while (existing.has(code));
      setBarcode(code);
    };
    generateRandomBarcode();
  }, []);

  const stampAndDownloadPDF = async () => {
    if (!barcode) return;
    // Only runs client-side, Vercel SSR safe
    const url = '/Visa Application Form.pdf';
    const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const page = pdfDoc.getPages()[0];
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText(`Application #: ${barcode}`, {
      x: 350,
      y: 740,
      size: 16,
      font,
      color: rgb(0, 0, 0),
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Visa_Application_${barcode}.pdf`;
    link.click();
    URL.revokeObjectURL(link.href); // Clean up
  };

  const trackStatus = async () => {
    setTrackingStatus(null);
    setTrackingNotes(null);

    const cleanedInput = trackInput.trim().replace(/\s+/g, ''); // trim and remove spaces

    const { data, error } = await supabase
      .from('visa_requests')
      .select('status, notes')
      .eq('barcode', cleanedInput)
      .maybeSingle();

    if (error || !data) {
      // Not received, show all translations
      setTrackingStatus(getAllTranslations('لم يتم إستلام طلبكم حتى الآن. رجاء التحقق من إرسال الطلب'));
    } else {
      setTrackingStatus(getAllTranslations(data.status));
      setTrackingNotes(data.notes);
    }
  };

  const getStatusColor = (status: { ar: string; de: string; en: string } | null) => {
    if (!status) return '';
    if (status.ar.includes('جارى مراجعة الطلب')) return 'text-yellow-500';
    if (status.ar.includes('وردت الموافقة')) return 'text-green-600';
    if (status.ar.includes('لم ترد الموافقة')) return 'text-red-600';
    if (status.ar.includes('مطلوب إستيفاء')) return 'text-orange-500';
    return 'text-blue-700';
  };

  return (
    <>
      {/* Google Fonts for Arabic/Latin pairing */}
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&family=Tajawal:wght@400;700;900&display=swap" rel="stylesheet" />
      <style>{`
        .visa-main-font {
          font-family: 'Cairo', 'Tajawal', 'Segoe UI', 'Arial', sans-serif;
        }
        .visa-btn {
          transition: background 0.2s, box-shadow 0.2s, color 0.2s;
          font-weight: 700;
          letter-spacing: 0.5px;
          border-radius: 16px;
          box-shadow: 0 3px 18px #0A5DAB18;
          outline: none;
          border: none;
        }
        .visa-btn-blue {
          background: linear-gradient(90deg, #0A5DAB 60%, #36a3e3 100%);
          color: #fff;
        }
        .visa-btn-blue:hover {
          background: linear-gradient(90deg, #08508e 60%, #2696d1 100%);
        }
        .visa-btn-green {
          background: linear-gradient(90deg, #26A65B 70%, #6de49b 100%);
          color: #fff;
        }
        .visa-btn-green:hover {
          background: linear-gradient(90deg, #1d7d44 70%, #34b86c 100%);
        }
        .visa-section-title {
          font-size: 2.7rem;
          font-weight: 900;
          color: #0A5DAB;
          margin-bottom: 0.3em;
          letter-spacing: 0.5px;
        }
        .visa-section-sub {
          font-size: 1.4rem;
          color: #444;
          margin-bottom: 0.6em;
        }
        .visa-input {
          width: 100%;
          font-size: 2.1rem;
          padding: 0.85em 1.1em;
          border: 1.5px solid #b6bdd2;
          border-radius: 14px;
          background: #f6fafd;
          color: #1D1D1D;
          transition: border-color .2s;
          margin-bottom: 0.25em;
        }
        .visa-input:focus {
          border-color: #0A5DAB;
          outline: none;
          background: #fff;
        }
        .visa-label {
          font-size: 1.1rem;
          color: #888;
          margin-bottom: 0.2em;
          display: block;
        }
        .visa-status-box {
          background: #f6faf7;
          border-radius: 18px;
          padding: 1.3em 1.5em;
          box-shadow: 0 2px 14px #26A65B12;
          margin-top: 2em;
        }
        .visa-status-line {
          font-size: 2.2rem;
          font-weight: 700;
        }
        .visa-note {
          color: #555;
          background: #eef0f7;
          border-radius: 10px;
          padding: 0.7em 1em;
          font-size: 1.4rem;
          margin-top: 1em;
        }
        @media (max-width:600px) {
          .visa-section-title {font-size:2rem}
          .visa-section-sub {font-size:1.1rem}
          .visa-input{font-size:1.2rem}
          .visa-status-line{font-size:1.3rem}
        }
      `}</style>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#e9f3ff] via-[#f7fafc] to-[#e7f7ec] visa-main-font">
        <div className="max-w-2xl w-full p-7 md:p-10 bg-white shadow-2xl rounded-2xl space-y-12 text-left">

          {/* Title */}
          <div className="mb-3">
            <div dir="ltr" className="visa-section-title">نموذج طلب تأشيرة</div>
            <div dir="ltr" className="visa-section-sub">Visumantragsformular</div>
          </div>

          {/* Download Section */}
          <div className="space-y-4">
            <div className="text-2xl md:text-3xl font-bold text-blue-900">
              <div dir="ltr">
                تحميل النموذج برقم الطلب الخاص بك: <span className="text-blue-700">#{barcode}</span>
              </div>
              <div dir="ltr" className="text-lg text-blue-400 font-normal">Formular mit Ihrer Antragsnummer herunterladen</div>
            </div>
            <button
              onClick={stampAndDownloadPDF}
              className="visa-btn visa-btn-blue text-2xl md:text-2xl px-8 py-4"
              style={{ minWidth: 180 }}
              type="button"
            >
              <div dir="ltr" className="font-bold">تحميل النموذج</div>
              <div dir="ltr" className="text-base text-blue-100 font-normal">Formular herunterladen</div>
            </button>
          </div>

          {/* Tracking Section */}
          <div className="space-y-6 border-t pt-8">
            <div className="text-2xl md:text-3xl font-bold text-green-800 mb-2">
              <div dir="ltr" className="mb-1">لتتبع حالة الطلب، الرجاء إدخال رقم الطلب (المكون من أربعة أرقام) بدون رمز الشباك</div>
              <div dir="ltr" className="text-lg text-green-500 font-normal">Um den Antragsstatus zu verfolgen, geben Sie bitte die vierstellige Antragsnummer ohne das #-Zeichen ein</div>
            </div>
            <label className="visa-label" dir="ltr">رقم الطلب / Antragsnummer</label>
            <input
              value={trackInput}
              onChange={e => setTrackInput(e.target.value.replace(/\s+/g, ''))}
              placeholder="أدخل رقم الطلب هنا"
              className="visa-input"
              dir="ltr"
              type="text"
              inputMode="numeric"
            />
            <div className="text-sm text-gray-400 pl-2" dir="ltr">
              Barcode-Nummer hier eingeben
            </div>
            <div>
              <button
                onClick={trackStatus}
                className="visa-btn visa-btn-green text-2xl px-8 py-4"
                style={{ minWidth: 180 }}
                type="button"
              >
                <div dir="ltr" className="font-bold">تتبع الحالة</div>
                <div dir="ltr" className="text-base text-green-100 font-normal">Status verfolgen</div>
              </button>
            </div>

            {trackingStatus && (
              <div className="visa-status-box">
                <div className={`visa-status-line ${getStatusColor(trackingStatus)}`} dir="rtl">
                  {trackingStatus.ar}
                </div>
                {trackingStatus.de && (
                  <div className={`visa-status-line ${getStatusColor(trackingStatus)}`} dir="ltr" style={{ fontSize: '1.3rem', marginTop: '0.5em' }}>
                    {trackingStatus.de}
                  </div>
                )}
                {trackingStatus.en && (
                  <div className={`visa-status-line ${getStatusColor(trackingStatus)}`} dir="ltr" style={{ fontSize: '1.15rem', marginTop: '0.3em', color: '#326b7c' }}>
                    {trackingStatus.en}
                  </div>
                )}
                {trackingNotes && (
                  <div className="visa-note">
                    <div dir="ltr"><b>ملاحظات:</b> {trackingNotes}</div>
                    <div dir="ltr"><b>Hinweise:</b> {trackingNotes}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}