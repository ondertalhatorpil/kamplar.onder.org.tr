import { useLocation, Link } from 'react-router-dom';
import { CheckCircle, MessageSquare, Clock } from 'lucide-react';

export default function ReservationSuccessPage() {
  const location = useLocation();
  const { reservation_number, phone } = location.state || {};

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* No page-local header — the global floating Navbar is the only
          header now. */}
      <div className="flex-1 flex items-center justify-center px-6 pt-28 pb-12">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-primary-600" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-3">Talebiniz Alındı!</h1>
          <p className="text-gray-500 mb-8">
            Rezervasyon talebiniz başarıyla oluşturuldu.
          </p>

          {reservation_number && (
            <div className="card p-6 mb-6 text-left">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Rezervasyon Numarası</p>
              <p className="text-2xl font-bold text-primary-700">{reservation_number}</p>
              <p className="text-sm text-gray-500 mt-1">Bu numarayı saklayınız.</p>
            </div>
          )}

          <div className="card p-6 mb-6 text-left space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <MessageSquare size={16} className="text-red-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">SMS Bildirimi</p>
                <p className="text-sm text-gray-500">
                  {phone ? `${phone} numaralı telefona` : 'Kayıtlı telefon numaranıza'} başvurunuzun alındığına dair SMS gönderildi.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock size={16} className="text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">İnceleme Süreci</p>
                <p className="text-sm text-gray-500">
                  Tarih ve kapasite uygunluğu incelendikten sonra SMS ile bilgilendirileceksiniz.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 text-left">
            <p className="text-sm text-red-800">
              <strong>Önemli:</strong> Rezervasyon onaylandığında SMS ile bir belge yükleme bağlantısı gönderilecektir.
              Bu bağlantı üzerinden katılımcı listenizi ve imzalı taahhütnamenizi yüklemeniz gerekecektir.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center ">
            <Link to="/" className="btn-secondary btn-fill hover:bg-white hover:text-white hover:border-brand rounded-3xl">
              Ana Sayfaya Dön
            </Link>
            <Link to="/rezervasyon" className="btn-primary btn-fill btn-fill-white border-2 border-primary-700 hover:bg-primary-700 hover:text-primary-700 transition-colors duration-300 rounded-3xl">
              Yeni Rezervasyon
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
