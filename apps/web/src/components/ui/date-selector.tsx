import { ClientDate } from '../client-date';
import { Pill } from './pill';

// "Format court + date numérique, dans la locale du navigateur" (handoff design), ex "jeu. 17/09".
export function DateSelector({
  days,
  selected,
  onSelect,
}: {
  days: string[];
  selected: string;
  onSelect: (day: string) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4 }}>
      {days.map((d) => (
        <Pill key={d} selected={d === selected} onClick={() => onSelect(d)}>
          <ClientDate iso={d} options={{ weekday: 'short', day: '2-digit', month: '2-digit' }} fallback={d} />
        </Pill>
      ))}
    </div>
  );
}
