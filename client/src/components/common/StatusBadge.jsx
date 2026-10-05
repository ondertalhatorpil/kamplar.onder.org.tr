import { getStatusLabel, getStatusClass } from '../../utils/helpers';

export default function StatusBadge({ status }) {
  return (
    <span className={getStatusClass(status)}>
      {getStatusLabel(status)}
    </span>
  );
}
