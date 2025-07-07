import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const supabase = createClient(
  'https://rbsrverouylthjdbrxgd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJic3J2ZXJvdXlsdGhqZGJyeGdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxNDQ1MTQsImV4cCI6MjA1OTcyMDUxNH0.KckvPMHcEWVHfKVNBRjLZENIsMi3uTXAsmvRXdrH74o'
);

export default function VisaAppPage() {
  const [barcode, setBarcode] = useState(null);
  const [trackInput, setTrackInput] = useState('');
  const [trackingStatus, setTrackingStatus] = useState(null);
  const [trackingNotes, setTrackingNotes] = useState(null);

  const arabicToGerman = {
    'جارى مراجعة الطلب. رجاء التحقق لاحقاً':
      'Der Antrag wird geprüft. Bitte überprüfen Sie später erneut.',
    'وردت الموافقة. رجاء إحضار جـواز السفر والأوراق المطلوبة خلال المواعيد المحددة أو الإرسال بالبريد المسجل مع مظروف إعادة مستوفى الطوابع والعنوان':
      'Die Genehmigung ist eingegangen. Bitte bringen Sie Ihren Reisepass und die erforderlichen Unterlagen innerhalb der festgelegten Fristen oder senden Sie sie per Einschreiben mit einem ausreichend frankierten Rückumschlag und Ihrer Adresse.',
    'لم ترد الموافقة':
      'Die Genehmigung wurde nicht erteilt.',
    'مطلوب إستيفاء':
      'Ergänzende Angaben erforderlich.',
  };

  const generateRandomBarcode = async () => {
    const { data } = await supabase.from('visa_requests').select('barcode');
    const existing = new Set((data || []).map(d => d.barcode));

    let code;
    do {
      code = Math.floor(1000 + Math.random() * 9000).toString();
    } while (existing.has(code));

    setBarcode(code);
  };

  const stampAndDownloadPDF = async () => {
    if (!barcode) return;

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
  };

  const trackStatus = async () => {
    setTrackingStatus(null);
    setTrackingNotes(null);
    const { data } = await supabase
      .from('visa_requests')
      .select('status, notes')
      .eq('barcode', trackInput)
      .maybeSingle();

    if (!data) {
      setTrackingStatus(
        'لم يتم إستلام طلبكم حتى الآن. رجاء التحقق من إرسال الطلب\nIhr Antrag wurde noch nicht empfangen. Bitte überprüfen Sie den Versand.'
      );
    } else {
      const arabic = data.status;
      const german = arabicToGerman[arabic] || '';
      setTrackingStatus(`${arabic}\n${german}`);
      setTrackingNotes(data.notes);
    }
  };

  useEffect(() => {
    generateRandomBarcode();
  }, []);

  const getStatusColor = (status) => {
    if (!status) return '';
    if (status.includes('جارى مراجعة الطلب')) return 'text-yellow-500';
    if (status.includes('وردت الموافقة')) return 'text-green-600';
    if (status.includes('لم ترد الموافقة')) return 'text-red-600';
    if (status.includes('مطلوب إستيفاء')) return 'text-orange-500';
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
              style={{minWidth:180}}
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
              onChange={e => setTrackInput(e.target.value)}
              placeholder="أدخل رقم الطلب هنا"
              className="visa-input"
              dir="ltr"
            />
            <div className="text-sm text-gray-400 pl-2" dir="ltr">
              Barcode-Nummer hier eingeben
            </div>
            <div>
              <button
                onClick={trackStatus}
                className="visa-btn visa-btn-green text-2xl px-8 py-4"
                style={{minWidth:180}}
              >
                <div dir="ltr" className="font-bold">تتبع الحالة</div>
                <div dir="ltr" className="text-base text-green-100 font-normal">Status verfolgen</div>
              </button>
            </div>

            {trackingStatus && (
              <div className="visa-status-box">
                {trackingStatus.split('\n').map((line, idx) => (
                  <div
                    key={idx}
                    className={`visa-status-line ${getStatusColor(trackingStatus)}`}
                    dir="ltr"
                  >
                    {line}
                  </div>
                ))}
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