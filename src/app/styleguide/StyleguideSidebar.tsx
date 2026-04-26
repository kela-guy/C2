import {
  NAV,
  type NavGroup,
  type NavItem,
} from './navConfig';

interface StyleguideSidebarProps {
  activeItem: string;
  onSelectPage: (id: string) => void;
}

export function StyleguideSidebar({
  activeItem,
  onSelectPage,
}: StyleguideSidebarProps) {
  return (
    <nav className="sticky top-0 h-screen w-[260px] shrink-0 overflow-y-auto py-6 pl-8 pr-6 scrollbar-none">
      <a href="#top" className="flex items-center gap-1.5 mb-8">
        <span className="text-[14px] font-semibold text-white tracking-tight">C2 Hub</span>
        <span className="text-[14px] font-normal text-n-8 tracking-tight">docs</span>
      </a>

      {NAV.map((group) => (
        <SidebarGroup
          key={group.label}
          group={group}
          activeItem={activeItem}
          onSelectPage={onSelectPage}
        />
      ))}

      <div
        aria-hidden
        className="sticky bottom-0 -mb-6 z-10 h-12 shrink-0 pointer-events-none bg-linear-to-t from-[#111] to-transparent"
      />
    </nav>
  );
}

function SidebarGroup({
  group,
  activeItem,
  onSelectPage,
}: {
  group: NavGroup;
  activeItem: string;
  onSelectPage: (id: string) => void;
}) {
  return (
    <div className="mb-6">
      <span className="block text-xs font-semibold text-white/50 mb-2">
        {group.label}
      </span>
      <ul className="space-y-0.5">
        {group.items.map((item) => (
          <SidebarItem
            key={item.id}
            item={item}
            activeItem={activeItem}
            onSelectPage={onSelectPage}
          />
        ))}
      </ul>
    </div>
  );
}

function SidebarItem({
  item,
  activeItem,
  onSelectPage,
}: {
  item: NavItem;
  activeItem: string;
  onSelectPage: (id: string) => void;
}) {
  const isActive = activeItem === item.id;

  return (
    <li>
      <a
        href={`#${item.id}`}
        onClick={(e) => {
          e.preventDefault();
          onSelectPage(item.id);
        }}
        className={`block py-[5px] text-xs cursor-pointer transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent rounded-md ${
          isActive
            ? 'text-white font-medium bg-white/[0.07] px-2.5 -mx-2.5'
            : 'text-n-9 font-medium hover:text-n-11 hover:bg-white/[0.03] px-2.5 -mx-2.5'
        }`}
      >
        {item.label}
      </a>
    </li>
  );
}
