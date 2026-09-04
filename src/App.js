import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const supabase = createClient(
  'https://rbsrverouylthjdbrxgd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJic3J2ZXJvdXlsdGhqZGJyeGdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxNDQ1MTQsImV4cCI6MjA1OTcyMDUxNH0.KckvPMHcEWVHfKVNBRjLZENIsMi3uTXAsmvRXdrH74o'
);

const statusTranslations = {
  'جارى مراجعة الطلب. رجاء التحقق لاحقاً': {
    de: 'Ihr Antrag wird derzeit geprüft. Bitte versuchen Sie es später erneut.',
    ar: 'طلبكم قيد المراجعة حاليًا. يُرجى التحقق مرة أخرى لاحقًا.',
  },
  'وردت الموافقة، رجاء إحضار جـواز السفر والأوراق المطلوبة خلال المواعيد المحددة أو الإرسال بالبريد المسجل مع مظروف إعادة مستوفى الطوابع والعنوان': {
    de: 'Die Genehmigung wurde erteilt. Bitte reichen Sie Ihren Reisepass und die erforderlichen Unterlagen während der festgelegten Zeiten persönlich ein oder senden Sie diese per Einschreiben zusammen mit einem ausreichend frankierten und adressierten Rückumschlag.',
    ar: 'وردت الموافقة. يُرجى تقديم جواز السفر والمستندات المطلوبة شخصيًا خلال المواعيد المحددة، أو إرسالها بالبريد المسجل مع مظروف إعادة مستوفى الطوابع ومدوّن عليه العنوان.',
  },
  'وردت الموافقة. رجاء إحضار جـواز السفر والأوراق المطلوبة خلال المواعيد المحددة أو الإرسال بالبريد المسجل مع مظروف إعادة مستوفى الطوابع والعنوان': {
    de: 'Die Genehmigung wurde erteilt. Bitte reichen Sie Ihren Reisepass und die erforderlichen Unterlagen während der festgelegten Zeiten persönlich ein oder senden Sie diese per Einschreiben zusammen mit einem ausreichend frankierten und adressierten Rückumschlag.',
    ar: 'وردت الموافقة. يُرجى تقديم جواز السفر والمستندات المطلوبة شخصيًا خلال المواعيد المحددة، أو إرسالها بالبريد المسجل مع مظروف إعادة مستوفى الطوابع ومدوّن عليه العنوان.',
  },
  'لم ترد الموافقة': {
    de: 'Ihr Visumantrag wurde abgelehnt. Leider wurde die für die Erteilung des Visums erforderliche Genehmigung nicht erteilt.',
    ar: 'نأسف لإبلاغكم بأنه قد تم رفض طلب التأشيرة، لعدم ورود الموافقة اللازمة لإصدارها.',
  },
  'مطلوب إستيفاء': {
    de: 'Für die weitere Bearbeitung sind zusätzliche Angaben oder Unterlagen erforderlich. Bitte beachten Sie die nachstehenden Hinweise.',
    ar: 'يلزم استيفاء بيانات أو مستندات إضافية لمواصلة نظر الطلب. يُرجى الاطلاع على الملاحظات أدناه.',
  },
  'لم يتم إستلام طلبكم حتى الآن. رجاء التحقق من إرسال الطلب': {
    de: 'Unter dieser Antragsnummer wurde noch kein Antrag registriert. Bitte überprüfen Sie die Nummer und vergewissern Sie sich, dass der Antrag abgesendet wurde.',
    ar: 'لم يُسجَّل طلب بهذا الرقم حتى الآن. يُرجى التحقق من صحة الرقم والتأكد من إرسال الطلب.',
  },
};

function getTranslations(storedStatus) {
  if (statusTranslations[storedStatus]) {
    return statusTranslations[storedStatus];
  }

  if (storedStatus && storedStatus.includes('\n')) {
    const [arabicStatus, germanStatus] = storedStatus.split('\n');

    if (statusTranslations[arabicStatus]) {
      return {
        de: germanStatus || statusTranslations[arabicStatus].de,
        ar: statusTranslations[arabicStatus].ar,
      };
    }
  }

  return {
    de: 'Der aktuelle Bearbeitungsstatus kann momentan nicht angezeigt werden. Bitte wenden Sie sich an das Konsulat.',
    ar: 'يتعذر عرض حالة الطلب الحالية في الوقت الراهن. يُرجى التواصل مع القنصلية.',
  };
}

async function generateUniqueBarcode() {
  const { data, error } = await supabase
    .from('visa_requests')
    .select('barcode');

  if (error) console.error(error);

  const existing = new Set(
    (data || []).map((item) => item.barcode)
  );

  let code;

  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (existing.has(code));

  return code;
}

export default function App() {
  const [barcode, setBarcode] = useState(null);
  const [trackInput, setTrackInput] = useState('');
  const [trackingStatus, setTrackingStatus] = useState(null);
  const [trackingNotes, setTrackingNotes] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);

  useEffect(() => {
    generateUniqueBarcode().then(setBarcode);
  }, []);

  const stampAndDownloadPDF = async () => {
    if (!barcode || isDownloading) return;

    const applicationNumber = barcode;

    setBarcode(null);
    setIsDownloading(true);
    setDownloadError(false);

    try {
      const response = await fetch('/Visa Application Form.pdf');

      if (!response.ok) {
        throw new Error('PDF konnte nicht geladen werden.');
      }

      const pdfDoc = await PDFDocument.load(
        await response.arrayBuffer()
      );

      const page = pdfDoc.getPages()[0];
      const font = await pdfDoc.embedFont(
        StandardFonts.Helvetica
      );

      page.drawText(`Antragsnummer: ${applicationNumber}`, {
        x: 50,
        y: 740,
        size: 16,
        font,
        color: rgb(0, 0, 0),
      });

      const pdfBytes = await pdfDoc.save();

      const objectUrl = URL.createObjectURL(
        new Blob([pdfBytes], {
          type: 'application/octet-stream',
        })
      );

      const link = document.createElement('a');

      link.href = objectUrl;
      link.download = `Visumantrag_${applicationNumber}.pdf`;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 1000);

      const nextBarcode = await generateUniqueBarcode();
      setBarcode(nextBarcode);
    } catch (error) {
      console.error(error);
      setBarcode(applicationNumber);
      setDownloadError(true);
    } finally {
      setIsDownloading(false);
    }
  };

  const trackStatus = async () => {
    const cleanedInput = trackInput
      .replace(/\D/g, '')
      .slice(0, 4);

    setTrackingStatus(null);
    setTrackingNotes(null);

    if (cleanedInput.length !== 4) {
      setTrackingStatus({
        de: 'Bitte geben Sie eine gültige vierstellige Antragsnummer ein.',
        ar: 'يُرجى إدخال رقم طلب صحيح مكوّن من أربعة أرقام.',
        type: 'invalid',
      });

      return;
    }

    setIsTracking(true);

    const { data, error } = await supabase
      .from('visa_requests')
      .select('status, notes')
      .eq('barcode', cleanedInput)
      .maybeSingle();

    setIsTracking(false);

    if (error || !data) {
      setTrackingStatus({
        ...getTranslations(
          'لم يتم إستلام طلبكم حتى الآن. رجاء التحقق من إرسال الطلب'
        ),
        type: 'not-found',
      });

      return;
    }

    setTrackingStatus({
      ...getTranslations(data.status),
      source: data.status,
    });

    setTrackingNotes(data.notes);
  };

  const getStatusClass = (status) => {
    const source = status?.source || '';

    if (source.includes('جارى مراجعة الطلب')) {
      return 'status-review';
    }

    if (source.includes('وردت الموافقة')) {
      return 'status-approved';
    }

    if (source.includes('لم ترد الموافقة')) {
      return 'status-rejected';
    }

    if (source.includes('مطلوب إستيفاء')) {
      return 'status-required';
    }

    return 'status-info';
  };

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Inter:wght@400;600;700;800&display=swap"
        rel="stylesheet"
      />

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
        }

        .visa-page {
          min-height: 100vh;
          padding: 32px 18px;
          background: linear-gradient(
            145deg,
            #eef5fb 0%,
            #f8fafc 55%,
            #eef8f2 100%
          );
          font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
          color: #172033;
        }

        .visa-container {
          width: 100%;
          max-width: 790px;
          margin: 0 auto;
        }

        .visa-header {
          margin-bottom: 28px;
        }

        .visa-header h1 {
          margin: 0;
          color: #084f91;
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 800;
        }

        .visa-header .ar-title {
          margin-top: 7px;
          font-family: 'Cairo', sans-serif;
          color: #5e6d7d;
          font-size: 1.3rem;
          font-weight: 600;
        }

        .visa-card {
          background: #ffffff;
          border: 1px solid #dce5ee;
          border-radius: 20px;
          padding: clamp(22px, 5vw, 36px);
          box-shadow: 0 10px 30px rgba(36, 62, 89, 0.08);
        }

        .visa-card + .visa-card {
          margin-top: 28px;
        }

        .section-heading {
          display: flex;
          align-items: flex-start;
          gap: 15px;
          margin-bottom: 24px;
        }

        .section-number {
          flex: 0 0 40px;
          height: 40px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          color: #ffffff;
          background: #0a5dab;
          font-size: 1.15rem;
          font-weight: 800;
        }

        .tracking-card .section-number {
          background: #197a48;
        }

        .section-heading h2 {
          margin: 0;
          font-size: 1.5rem;
          color: #153e65;
        }

        .tracking-card .section-heading h2 {
          color: #17633e;
        }

        .arabic-secondary {
          margin-top: 5px;
          font-family: 'Cairo', sans-serif;
          direction: rtl;
          text-align: left;
          color: #647182;
          font-size: 1rem;
          line-height: 1.8;
        }

        .application-number {
          margin-bottom: 20px;
          padding: 15px 18px;
          background: #eef6fd;
          border: 1px solid #c9e0f4;
          border-radius: 12px;
        }

        .application-number strong {
          display: block;
          min-height: 34px;
          margin-top: 3px;
          color: #084f91;
          font-size: 1.75rem;
        }

        .visa-label {
          display: block;
          margin-bottom: 9px;
          color: #26384a;
          font-size: 1rem;
          font-weight: 700;
        }

        .visa-label-ar {
          margin-left: 7px;
          font-family: 'Cairo', sans-serif;
          color: #728092;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .visa-input {
          width: 100%;
          padding: 17px 18px;
          border: 2px solid #c8d3df;
          border-radius: 12px;
          background: #fbfdff;
          color: #172033;
          font-size: 1.2rem;
          transition: 0.2s;
        }

        .visa-input:focus {
          border-color: #197a48;
          outline: none;
          box-shadow: 0 0 0 4px rgba(25, 122, 72, 0.1);
          background: #ffffff;
        }

        .visa-input::placeholder {
          color: #788595;
          opacity: 1;
        }

        .input-help {
          margin: 8px 0 19px;
          color: #687789;
          font-size: 0.88rem;
          line-height: 1.55;
        }

        .input-help-ar {
          display: block;
          font-family: 'Cairo', sans-serif;
          direction: rtl;
          text-align: left;
        }

        .visa-btn {
          width: 100%;
          padding: 14px 20px;
          border: 0;
          border-radius: 12px;
          color: #ffffff;
          cursor: pointer;
          font: inherit;
          font-weight: 800;
          transition: transform 0.15s, filter 0.2s;
        }

        .visa-btn:hover:not(:disabled) {
          filter: brightness(0.94);
          transform: translateY(-1px);
        }

        .visa-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .visa-btn-blue {
          background: #0a5dab;
        }

        .visa-btn-green {
          background: #197a48;
        }

        .btn-de {
          display: block;
          font-size: 1.05rem;
        }

        .btn-ar {
          display: block;
          margin-top: 2px;
          font-family: 'Cairo', sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          opacity: 0.9;
        }

        .status-box {
          margin-top: 24px;
          padding: 20px;
          border-left: 6px solid;
          border-radius: 14px;
        }

        .status-approved {
          background: #edf9f1;
          border-color: #198754;
          color: #126638;
        }

        .status-rejected {
          background: #fff1f1;
          border-color: #c93636;
          color: #9b2424;
        }

        .status-review {
          background: #fff8df;
          border-color: #d39c14;
          color: #735408;
        }

        .status-required {
          background: #fff3e8;
          border-color: #dd7a24;
          color: #89470d;
        }

        .status-info {
          background: #eef6fd;
          border-color: #0a5dab;
          color: #164f7d;
        }

        .status-de {
          font-size: 1.13rem;
          font-weight: 800;
          line-height: 1.55;
        }

        .status-ar {
          margin-top: 9px;
          padding-top: 9px;
          border-top: 1px solid currentColor;
          font-family: 'Cairo', sans-serif;
          direction: rtl;
          text-align: left;
          font-size: 0.95rem;
          font-weight: 600;
          line-height: 1.8;
          opacity: 0.88;
        }

        .visa-note {
          margin-top: 15px;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.7);
          border-radius: 10px;
          color: #37475a;
          line-height: 1.6;
        }

        .note-ar {
          margin-left: 5px;
          font-family: 'Cairo', sans-serif;
        }

        .error-message {
          margin-top: 14px;
          padding: 12px 14px;
          border-radius: 10px;
          background: #fff1f1;
          color: #a32929;
          font-weight: 600;
        }

        @media (max-width: 600px) {
          .visa-page {
            padding: 20px 12px;
          }

          .visa-card {
            border-radius: 16px;
          }

          .section-heading h2 {
            font-size: 1.22rem;
          }

          .section-number {
            flex-basis: 34px;
            height: 34px;
          }

          .application-number strong {
            font-size: 1.45rem;
          }
        }
      `}</style>

      <main className="visa-page">
        <div className="visa-container">
          <header className="visa-header">
            <h1>Visumantragsformular</h1>

            <div className="ar-title" dir="rtl">
              نموذج طلب تأشيرة
            </div>
          </header>

          <section
            className="visa-card"
            aria-labelledby="download-title"
          >
            <div className="section-heading">
              <span className="section-number">1</span>

              <div>
                <h2 id="download-title">
                  Visumantragsformular herunterladen
                </h2>

                <div className="arabic-secondary">
                  تحميل نموذج طلب التأشيرة
                </div>
              </div>
            </div>

            <div className="application-number">
              <span>Ihre persönliche Antragsnummer</span>

              <strong>
                {barcode ? `#${barcode}` : ''}
              </strong>

              <div className="arabic-secondary">
                رقم الطلب الخاص بكم
              </div>
            </div>

            <button
              onClick={stampAndDownloadPDF}
              className="visa-btn visa-btn-blue"
              type="button"
              disabled={!barcode || isDownloading}
            >
              <span className="btn-de">
                {isDownloading
                  ? 'Formular wird vorbereitet …'
                  : 'Formular herunterladen'}
              </span>

              <span className="btn-ar">
                {isDownloading
                  ? 'جارٍ إعداد النموذج…'
                  : 'تحميل النموذج'}
              </span>
            </button>

            {downloadError && (
              <div className="error-message" role="alert">
                <div>
                  Das Formular konnte nicht heruntergeladen werden.
                  Bitte versuchen Sie es erneut.
                </div>

                <div className="arabic-secondary">
                  تعذّر تحميل النموذج. يُرجى المحاولة مرة أخرى.
                </div>
              </div>
            )}
          </section>

          <section
            className="visa-card tracking-card"
            aria-labelledby="tracking-title"
          >
            <div className="section-heading">
              <span className="section-number">2</span>

              <div>
                <h2 id="tracking-title">
                  Bearbeitungsstatus prüfen
                </h2>

                <div className="arabic-secondary">
                  الاستعلام عن حالة الطلب
                </div>
              </div>
            </div>

            <label
              className="visa-label"
              htmlFor="application-number"
            >
              Antragsnummer

              <span className="visa-label-ar">
                رقم الطلب
              </span>
            </label>

            <input
              id="application-number"
              value={trackInput}
              onChange={(event) =>
                setTrackInput(
                  event.target.value
                    .replace(/\D/g, '')
                    .slice(0, 4)
                )
              }
              onKeyDown={(event) =>
                event.key === 'Enter' && trackStatus()
              }
              placeholder="Antragsnummer hier eingeben / أدخل رقم الطلب هنا"
              className="visa-input"
              dir="ltr"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
            />

            <div className="input-help">
              Bitte geben Sie die vierstellige Antragsnummer ohne
              das #-Zeichen ein.

              <span className="input-help-ar">
                يُرجى إدخال رقم الطلب المكوّن من أربعة أرقام دون
                علامة #.
              </span>
            </div>

            <button
              onClick={trackStatus}
              className="visa-btn visa-btn-green"
              type="button"
              disabled={isTracking}
            >
              <span className="btn-de">
                {isTracking
                  ? 'Status wird geprüft …'
                  : 'Status prüfen'}
              </span>

              <span className="btn-ar">
                {isTracking
                  ? 'جارٍ التحقق من الحالة…'
                  : 'الاستعلام عن الحالة'}
              </span>
            </button>

            {trackingStatus && (
              <div
                className={`status-box ${getStatusClass(
                  trackingStatus
                )}`}
                role="status"
                aria-live="polite"
              >
                <div className="status-de" dir="ltr">
                  {trackingStatus.de}
                </div>

                <div className="status-ar" dir="rtl">
                  {trackingStatus.ar}
                </div>

                {trackingNotes && (
                  <div className="visa-note">
                    <strong>
                      Hinweise
                      <span className="note-ar">
                        {' '}/ ملاحظات
                      </span>
                      :
                    </strong>{' '}

                    {trackingNotes}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}