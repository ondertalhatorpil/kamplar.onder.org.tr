import { useState, useEffect } from 'react';
import { XCircle, AlertTriangle } from 'lucide-react';
import Modal from '../common/Modal';

// Talep reddi onay penceresi. `recipientText` red nedeninin kime SMS olarak
// gideceğini söyler (ör. "genel merkez adminlerine").
export default function RejectReservationModal({ isOpen, onClose, onConfirm, loading, reservationNumber, recipientText }) {
  const [reason, setReason] = useState('');

  useEffect(() => { if (isOpen) setReason(''); }, [isOpen]);

  const valid = reason.trim().length >= 10;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Talebi Reddet">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">
            <strong>{reservationNumber}</strong> numaralı talebi reddetmek istediğinize emin misiniz?
            Red nedeni {recipientText} SMS olarak iletilecektir. Başvuru sahibine ise neden belirtilmeden
            talebinin uygun bulunmadığı SMS ile bildirilecektir. Bu işlem geri alınamaz.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Red Nedeni * <span className="text-gray-400 font-normal">(en az 10 karakter)</span>
          </label>
          <textarea
            className="input-field"
            rows={4}
            placeholder="Red nedenini açıklayın."
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">{reason.length} karakter</p>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary">Vazgeç</button>
          <button
            onClick={() => onConfirm(reason.trim())}
            disabled={loading || !valid}
            className="btn-danger flex items-center gap-2"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <XCircle size={16} />}
            Evet, Reddet
          </button>
        </div>
      </div>
    </Modal>
  );
}
