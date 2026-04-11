import { navigationItems, type PageKey } from '../../data/navigation';

type BottomNavProps = {
  current: PageKey;
  onSelect: (key: PageKey) => void;
};

export function BottomNav({ current, onSelect }: BottomNavProps) {
  return (
    <nav className="mx-auto grid w-full max-w-3xl grid-cols-3 gap-2 p-3 md:grid-cols-6">
      {navigationItems.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onSelect(item.key)}
          className={`rounded-md px-2 py-2 text-xs font-medium transition md:text-sm ${
            current === item.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
          }`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
