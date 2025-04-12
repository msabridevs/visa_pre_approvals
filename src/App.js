return (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-2xl w-full p-8 bg-white shadow rounded-lg space-y-10">
      
      {/* Title */}
      <div className="text-center space-y-2">
        <div dir="rtl" className="text-5xl font-bold text-gray-800">نموذج طلب تأشيرة</div>
        <div dir="ltr" className="text-xl text-gray-600">Visumantragsformular</div>
      </div>

      {/* Download section */}
      <div className="space-y-4 text-center">
        <div className="text-2xl space-y-1">
          <div dir="rtl">تحميل النموذج مختوم برقم الطلب الخاص بك: <strong>#{barcode}</strong></div>
          <div dir="ltr" className="text-lg text-gray-600">Formular mit Ihrer Antragsnummer herunterladen</div>
        </div>
        <button
          onClick={stampAndDownloadPDF}
          className="bg-blue-600 text-white text-xl px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          <div dir="rtl">تحميل النموذج</div>
          <div dir="ltr" className="text-base text-gray-300">Formular herunterladen</div>
        </button>
      </div>

      {/* Tracking section */}
      <div className="space-y-6 border-t pt-6">
        <div className="text-2xl font-semibold space-y-1">
          <div dir="rtl">لتتبع حالة الطلب، الرجاء إدخال رقم الطلب (المكون من أربعة أعداد) بدون رمز الشباك</div>
          <div dir="ltr" className="text-lg text-gray-600">Um den Antragsstatus zu verfolgen, geben Sie bitte die vierstellige Antragsnummer ohne das #-Zeichen ein</div>
        </div>
        <input
          value={trackInput}
          onChange={e => setTrackInput(e.target.value)}
          placeholder="أدخل رقم الباركود هنا"
          className="w-full border border-gray-300 px-4 py-4 rounded text-right text-2xl"
          dir="rtl"
        />
        <div className="text-sm text-gray-500 text-left pl-2" dir="ltr">
          Barcode-Nummer hier eingeben
        </div>

        <div className="text-center">
          <button
            onClick={trackStatus}
            className="bg-green-600 text-white text-xl px-6 py-3 rounded-lg hover:bg-green-700"
          >
            <div dir="rtl">تتبع الحالة</div>
            <div dir="ltr" className="text-base text-gray-300">Status verfolgen</div>
          </button>
        </div>

        {trackingStatus && (
          <div className="mt-6 text-3xl font-bold text-center space-y-4">
            <p className={getStatusColor(trackingStatus)}>{trackingStatus}</p>
            {trackingNotes && (
              <div className="text-gray-700 text-2xl space-y-2">
                <div dir="rtl">ملاحظات: {trackingNotes}</div>
                <div dir="ltr" className="text-lg text-gray-600">Hinweise: {trackingNotes}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  </div>
);
