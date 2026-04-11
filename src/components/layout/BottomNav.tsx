import { navigationItems, type PageKey } from '../../data/navigation';

type BottomNavProps = {
  current: PageKey;
  onSelect: (key: PageKey) => void;
};

export function BottomNav({ current, onSelect }: BottomNavProps) {
  return (
    <nav className="sticky bottom-0 grid grid-cols-3 gap-2 border-t border-slate-200 bg-white p-3">
      {navigationItems.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onSelect(item.key)}
          className={`rounded-md px-2 py-2 text-xs font-medium transition ${
            current === item.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
          }`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
