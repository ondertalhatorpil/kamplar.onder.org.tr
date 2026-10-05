import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

// Phone-width replacement for the admin tables: one tappable card per
// reservation. `renderBadges` supplies the status badge(s) for the row.
export default function MobileReservationList({ items, getHref, renderBadges }) {
  return (
    <ul className="md:hidden divide-y divide-gray-100">
      {items.map(r => (
        <li key={r.id}>
          <Link to={getHref(r)} className="flex items-center gap-3 px-4 py-3 active:bg-gray-50">
            <div className="flex-1 min-w-0">
              <p className="font-mono text-sm font-medium text-gray-900">{r.reservation_number}</p>
              <p className="text-sm text-gray-800 truncate">{r.authorized_first_name} {r.authorized_last_name}</p>
              <p className="text-xs text-gray-500 truncate">
                {[r.campCenter?.name, r.participant_count && `${r.participant_count} kişi`].filter(Boolean).join(' · ')}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">{renderBadges(r)}</div>
            </div>
            <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
