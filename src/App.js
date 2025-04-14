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
    'الطلب قيد الفحص. رجاء التحقق لاحقاً':
      'Der Antrag wird geprüft. Bitte später erneut überprüfen.',
    'وردت الموافقة. رجاء إحضار جـواز السفر والأوراق المطلوبة خلال المواعيد المحددة أو الإرسال بالبريد المسجل مع مظروف إعادة مستوفى الطوابع والعنوان':
      'Genehmigung erteilt. Bitte bringen Sie Ihren Reisepass und die erforderlichen Unterlagen persönlich oder senden Sie sie per Einschreiben mit einem frankierten Rückumschlag und Ihrer Adresse.',
    'عدم موافقة': 'Nicht genehmigt.',
    'مطلوب إستيفاء بيانات': 'Weitere Informationen erforderlich.',
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
      size: 14,
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
    if (status.includes('الطلب قيد الفحص')) return 'text-yellow-500';
    if (status.includes('وردت الموافقة')) return 'text-green-600';
    if (status.includes('عدم موافقة')) return 'text-red-600';
    if (status.includes('مطلوب إستيفاء')) return 'text-orange-500';
    return 'text-blue-700';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-2xl w-full p-8 bg-white shadow rounded-lg space-y-10 text-left">

        {/* Title */}
        <div className="space-y-2">
          <div dir="ltr" className="text-5xl font-bold text-gray-800">نموذج طلب تأشيرة</div>
          <div dir="ltr" className="text-xl text-gray-600">Visumantragsformular</div>
        </div>

        {/* Download Section */}
        <div className="space-y-4">
          <div className="text-2xl space-y-1">
            <div dir="ltr">تحميل النموذج برقم الطلب الخاص بك: <strong>#{barcode}</strong></div>
            <div dir="ltr" className="text-lg text-gray-600">Formular mit Ihrer Antragsnummer herunterladen</div>
          </div>
          <button
            onClick={stampAndDownloadPDF}
            className="bg-blue-600 text-white text-xl px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            <div dir="ltr">تحميل النموذج</div>
            <div dir="ltr" className="text-base text-gray-300">Formular herunterladen</div>
          </button>
        </div>

        {/* Tracking Section */}
        <div className="space-y-6 border-t pt-6">
          <div className="text-2xl font-semibold space-y-1">
            <div dir="ltr">لتتبع حالة الطلب، الرجاء إدخال رقم الطلب (المكون من أربعة أرقام) بدون رمز الشباك</div>
            <div dir="ltr" className="text-lg text-gray-600">Um den Antragsstatus zu verfolgen, geben Sie bitte die vierstellige Antragsnummer ohne das #-Zeichen ein</div>
          </div>
          <input
            value={trackInput}
            onChange={e => setTrackInput(e.target.value)}
            placeholder="أدخل رقم الطلب هنا"
            className="w-full border border-gray-300 px-4 py-4 rounded text-left text-2xl"
            dir="ltr"
          />
          <div className="text-sm text-gray-500 text-left pl-2" dir="ltr">
            Barcode-Nummer hier eingeben
          </div>

          <div className="text-left">
            <button
              onClick={trackStatus}
              className="bg-green-600 text-white text-xl px-6 py-3 rounded-lg hover:bg-green-700"
            >
              <div dir="ltr">تتبع الحالة</div>
              <div dir="ltr" className="text-base text-gray-300">Status verfolgen</div>
            </button>
          </div>

          {trackingStatus && (
            <div className="mt-6 text-3xl font-bold text-left space-y-4">
              {trackingStatus.split('\n').map((line, idx) => (
                <p key={idx} className={getStatusColor(trackingStatus)} dir="ltr">
                  {line}
                </p>
              ))}
              {trackingNotes && (
                <div className="text-gray-700 text-2xl space-y-2">
                  <div dir="ltr">ملاحظات: {trackingNotes}</div>
                  <div dir="ltr">Hinweise: {trackingNotes}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
